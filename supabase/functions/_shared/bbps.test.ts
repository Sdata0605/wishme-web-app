// Local tests for the BBPS helpers and handler. Run from the functions folder with:
//   node --test --experimental-strip-types _shared/bbps.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BbpsInputError,
  buildFetchRequest,
  buildPaymentRequest,
  clearSetuTokenCache,
  type BbpsConfig,
  readBbpsConfig,
  redact,
  rupeesToPaise,
  validateMobile,
} from "./bbps.ts";
import { handleBbps, type BbpsDeps } from "./bbpsHandler.ts";

const ENV: Record<string, string> = {
  SETU_BASE_URL: "https://uat.setu.co/",
  SETU_CLIENT_ID: "test-client",
  SETU_CLIENT_SECRET: "test-secret-value",
  SETU_PARTNER_ID: "test-partner",
  SETU_AGENT_ID: "agent-1",
  SETU_AGENT_CHANNEL: "APP",
};
const env = (k: string) => ENV[k];

const cfg: BbpsConfig = {
  baseUrl: "https://uat.setu.co",
  clientId: "test-client",
  clientSecret: "test-secret-value",
  partnerId: "test-partner",
  agentId: "agent-1",
  agentChannel: "APP",
};

type Call = { url: string; method: string; headers: Record<string, string>; body?: unknown };

/** Mock Setu: records every call and answers from a route table. */
function mockSetu(routes: Record<string, (call: Call) => { status: number; body: unknown }>) {
  const calls: Call[] = [];
  const doFetch = async (url: string, init?: RequestInit) => {
    const path = url.replace("https://uat.setu.co", "");
    const call: Call = {
      url,
      method: init?.method ?? "GET",
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const route = routes[`${call.method} ${path}`];
    if (!route) return new Response(JSON.stringify({ success: false }), { status: 404 });
    const r = route(call);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
  };
  return { calls, doFetch };
}

const authRoute = () => ({ status: 200, body: { status: 200, success: true, data: { token: "tok-123", expiresIn: 1800 } } });

function req(body: unknown, token = "user-jwt") {
  return new Request("https://x.supabase.co/functions/v1/bbps", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

function deps(doFetch: BbpsDeps["doFetch"], over: Partial<BbpsDeps> = {}): BbpsDeps {
  return {
    env,
    doFetch,
    getUserId: async () => "user-1",
    now: () => new Date("2026-11-20T10:30:00Z"),
    ...over,
  };
}

test("readBbpsConfig reports missing secrets and trims the base URL", () => {
  const missing = readBbpsConfig(() => undefined);
  assert.ok("missing" in missing);
  assert.equal(missing.missing.length, 6);
  const ok = readBbpsConfig(env);
  assert.ok(!("missing" in ok));
  assert.equal(ok.baseUrl, "https://uat.setu.co");
});

test("rupeesToPaise converts to integer paise and rejects bad amounts", () => {
  assert.equal(rupeesToPaise(150.5), 15050);
  assert.equal(rupeesToPaise("99.99"), 9999);
  assert.equal(rupeesToPaise(1), 100);
  assert.throws(() => rupeesToPaise(0), BbpsInputError);
  assert.throws(() => rupeesToPaise(-5), BbpsInputError);
  assert.throws(() => rupeesToPaise("abc"), BbpsInputError);
  assert.throws(() => rupeesToPaise(10.005), BbpsInputError);
});

test("validateMobile accepts Indian mobiles only", () => {
  assert.equal(validateMobile("9876543210"), "9876543210");
  assert.throws(() => validateMobile("1234567890"), BbpsInputError);
  assert.throws(() => validateMobile("98765"), BbpsInputError);
});

test("buildFetchRequest matches the documented fetch body", () => {
  const body = buildFetchRequest(cfg, {
    billerId: "BESCOM00000NATB",
    mobile: "9876543210",
    customerParams: [{ name: "Consumer Number", value: "12345" }],
  });
  assert.deepEqual(body, {
    agent: { id: "agent-1", channel: "APP" },
    biller: { id: "BESCOM00000NATB" },
    customer: { mobile: "9876543210", customerParams: [{ name: "Consumer Number", value: "12345" }] },
  });
  assert.throws(() => buildFetchRequest(cfg, { billerId: "X", mobile: "9876543210", customerParams: [] }), BbpsInputError);
  assert.throws(() => buildFetchRequest(cfg, { billerId: "X", mobile: "9876543210", customerParams: [{ name: "a" }] }), BbpsInputError);
});

test("buildPaymentRequest sends paise, IST timestamp and a unique paymentRefId", () => {
  const now = new Date("2026-11-20T10:30:00Z");
  const body = buildPaymentRequest(
    { refId: "FETCH-1", amount: 1500.5, remitterName: "Asha", accountInfo: "asha@ybl" },
    now,
    () => 0.5,
  ) as any;
  assert.equal(body.refId, "FETCH-1");
  assert.equal(body.paymentDetails.amount, 150050);
  assert.equal(body.paymentDetails.mode, "UPI");
  assert.equal(body.paymentDetails.custConvFee, 0);
  assert.equal(body.paymentDetails.timestamp, "2026-11-20T16:00:00+05:30");
  assert.equal(body.paymentDetails.accountInfo, "asha@ybl");
  assert.equal(body.remitter.name, "Asha");
  assert.match(body.paymentDetails.paymentRefId, /^WMB[0-9A-Z]+$/);
  const again = buildPaymentRequest(
    { refId: "FETCH-1", amount: 1500.5, remitterName: "Asha", accountInfo: "asha@ybl" },
    new Date(now.getTime() + 1000),
    () => 0.9,
  ) as any;
  assert.notEqual(body.paymentDetails.paymentRefId, again.paymentDetails.paymentRefId);
});

test("redact hides secrets and masks mobile numbers", () => {
  const out = redact({ token: "abc", nested: { clientSecret: "s", mobile: "9876543210" }, ok: 1 }) as any;
  assert.equal(out.token, "<redacted>");
  assert.equal(out.nested.clientSecret, "<redacted>");
  assert.equal(out.nested.mobile.slice(-2), "10");
  assert.ok(!out.nested.mobile.startsWith("9876"));
  assert.equal(out.ok, 1);
});

test("health reports missing config without a user login", async () => {
  const res = await handleBbps(
    new Request("https://x", { method: "POST", body: JSON.stringify({ action: "health" }) }),
    deps(mockSetu({}).doFetch, { env: () => undefined, getUserId: async () => null }),
  );
  const body = (await res.json()) as any;
  assert.equal(res.status, 200);
  assert.equal(body.data.configured, false);
  assert.equal(body.data.missing.length, 6);
});

test("unknown action and missing login are rejected", async () => {
  const { doFetch } = mockSetu({});
  const bad = await handleBbps(req({ action: "delete_everything" }), deps(doFetch));
  assert.equal(bad.status, 400);
  const anon = await handleBbps(req({ action: "categories" }), deps(doFetch, { getUserId: async () => null }));
  assert.equal(anon.status, 401);
});

test("fetch_request sends auth headers and the documented body", async () => {
  clearSetuTokenCache();
  const { calls, doFetch } = mockSetu({
    "POST /api/v2/auth/token": authRoute,
    "POST /api/v2/bbps/bills/fetch/request": () => ({ status: 200, body: { success: true, data: { refId: "R1", status: "Processing" } } }),
  });
  const res = await handleBbps(
    req({ action: "fetch_request", billerId: "B1", mobile: "9876543210", customerParams: [{ name: "Consumer", value: "1" }] }),
    deps(doFetch),
  );
  const body = (await res.json()) as any;
  assert.equal(res.status, 200);
  assert.deepEqual(body.data, { refId: "R1", status: "Processing" });
  const fetchCall = calls.find((c) => c.url.endsWith("/fetch/request"))!;
  assert.equal(fetchCall.headers["X-PARTNER-ID"], "test-partner");
  assert.equal(fetchCall.headers.Authorization, "Bearer tok-123");
  assert.equal((fetchCall.body as any).biller.id, "B1");
  // The Setu client secret must only ever go to the auth endpoint.
  const authCall = calls.find((c) => c.url.endsWith("/auth/token"))!;
  assert.deepEqual(authCall.body, { clientID: "test-client", secret: "test-secret-value" });
  assert.ok(!calls.filter((c) => !c.url.endsWith("/auth/token")).some((c) => JSON.stringify(c).includes("test-secret-value")));
});

test("pay_request enforces the per-payment limit before calling Setu", async () => {
  clearSetuTokenCache();
  const { calls, doFetch } = mockSetu({ "POST /api/v2/auth/token": authRoute });
  const res = await handleBbps(
    req({ action: "pay_request", refId: "R1", amount: 20000, remitterName: "A", accountInfo: "a@ybl" }),
    deps(doFetch),
  );
  assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
});

test("pay_request forwards a valid payment in paise", async () => {
  clearSetuTokenCache();
  const { calls, doFetch } = mockSetu({
    "POST /api/v2/auth/token": authRoute,
    "POST /api/v2/bbps/bills/payment/request": () => ({ status: 200, body: { success: true, data: { refId: "P1" } } }),
  });
  const res = await handleBbps(
    req({ action: "pay_request", refId: "R1", amount: "250.75", remitterName: "Asha", accountInfo: "asha@ybl" }),
    deps(doFetch),
  );
  assert.equal(res.status, 200);
  const pay = calls.find((c) => c.url.endsWith("/payment/request"))!;
  assert.equal((pay.body as any).paymentDetails.amount, 25075);
});

test("upstream errors come back as 502 with secrets redacted", async () => {
  clearSetuTokenCache();
  const { doFetch } = mockSetu({
    "POST /api/v2/auth/token": authRoute,
    "GET /api/v2/bbps/categories": () => ({ status: 400, body: { success: false, error: { code: "bad", token: "leak" } } }),
  });
  const res = await handleBbps(req({ action: "categories" }), deps(doFetch));
  const text = await res.text();
  assert.equal(res.status, 502);
  assert.ok(!text.includes("leak"));
  assert.ok(text.includes("<redacted>"));
});

test("an expired token (401) is refreshed once and the call retried", async () => {
  clearSetuTokenCache();
  let calls401 = 0;
  const { calls, doFetch } = mockSetu({
    "POST /api/v2/auth/token": authRoute,
    "GET /api/v2/bbps/categories": () => {
      calls401++;
      return calls401 === 1
        ? { status: 401, body: { success: false } }
        : { status: 200, body: { success: true, data: [{ id: "c1" }] } };
    },
  });
  const res = await handleBbps(req({ action: "categories" }), deps(doFetch));
  assert.equal(res.status, 200);
  assert.equal(calls.filter((c) => c.url.endsWith("/auth/token")).length, 2);
});
