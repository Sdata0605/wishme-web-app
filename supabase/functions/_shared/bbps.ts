// Setu BBPS (Bharat BillPay, agent/COU side) helpers.
// Pure TypeScript with no Deno imports so the same file runs under Deno (edge functions)
// and Node (local tests in _shared/bbps.test.ts).
//
// Documented flow (docs.setu.co/payments/billpay/api-integration):
//   auth:    POST {base}/api/v2/auth/token  { clientID, secret } -> { data: { token, expiresIn } }
//   every BBPS call: Authorization: Bearer <token>, X-PARTNER-ID: <partner id>
//   fetch:   POST /api/v2/bbps/bills/fetch/request   -> refId, then POST /api/v2/bbps/bills/fetch/response { refId }
//   pay:     POST /api/v2/bbps/bills/payment/request -> refId, then POST /api/v2/bbps/bills/payment/response { refId }
//   lists:   GET  /api/v2/bbps/categories, GET /api/v2/bbps/billers, GET /api/v2/bbps/disputes
// Amounts are always integer paise. Fetch/pay/dispute are asynchronous.

export interface BbpsConfig {
  baseUrl: string; // https://uat.setu.co (sandbox) or https://prod.setu.co (production)
  clientId: string;
  clientSecret: string;
  partnerId: string;
  agentId: string;
  agentChannel: string;
}

export function readBbpsConfig(env: (key: string) => string | undefined): BbpsConfig | { missing: string[] } {
  const names = {
    baseUrl: "SETU_BASE_URL",
    clientId: "SETU_CLIENT_ID",
    clientSecret: "SETU_CLIENT_SECRET",
    partnerId: "SETU_PARTNER_ID",
    agentId: "SETU_AGENT_ID",
    agentChannel: "SETU_AGENT_CHANNEL",
  } as const;
  const missing: string[] = [];
  const values: Record<string, string> = {};
  for (const [field, name] of Object.entries(names)) {
    const v = (env(name) ?? "").trim();
    if (!v) missing.push(name);
    values[field] = v;
  }
  if (missing.length) return { missing };
  return { ...(values as unknown as BbpsConfig), baseUrl: values.baseUrl.replace(/\/+$/, "") };
}

export class BbpsInputError extends Error {
  readonly status = 400;
}

const MOBILE_RE = /^[6-9]\d{9}$/;

export function requireString(body: Record<string, unknown>, key: string, opts: { max?: number } = {}): string {
  const v = body[key];
  if (typeof v !== "string" || !v.trim()) throw new BbpsInputError(`${key} is required`);
  const s = v.trim();
  if (opts.max && s.length > opts.max) throw new BbpsInputError(`${key} is too long (max ${opts.max})`);
  return s;
}

export function validateMobile(mobile: string): string {
  if (!MOBILE_RE.test(mobile)) throw new BbpsInputError("mobile must be a 10-digit Indian mobile number");
  return mobile;
}

/** Rupees (number or numeric string) -> integer paise. Rejects fractions of a paisa and non-positive values. */
export function rupeesToPaise(value: unknown, field = "amount"): number {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
    throw new BbpsInputError(`${field} must be a positive amount in rupees`);
  }
  const paise = Math.round(n * 100);
  if (Math.abs(paise / 100 - n) > 1e-9) throw new BbpsInputError(`${field} can have at most 2 decimal places`);
  return paise;
}

/** IST timestamp in the form the payment API expects, e.g. 2026-11-20T10:30:00+05:30. */
export function istTimestamp(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 19) + "+05:30";
}

/** Unique reference per debit. Setu requires paymentRefId to be unique for every payment. */
export function newPaymentRefId(now: Date = new Date(), rand: () => number = Math.random): string {
  const stamp = now.getTime().toString(36).toUpperCase();
  const r = Math.floor(rand() * 36 ** 4).toString(36).toUpperCase().padStart(4, "0");
  return `WMB${stamp}${r}`;
}

export interface CustomerParam {
  name: string;
  value: string;
}

export function parseCustomerParams(raw: unknown): CustomerParam[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new BbpsInputError("customerParams must be a non-empty array");
  return raw.map((p, i) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const value = typeof o.value === "string" || typeof o.value === "number" ? String(o.value).trim() : "";
    if (!name || !value) throw new BbpsInputError(`customerParams[${i}] needs a name and a value`);
    return { name, value };
  });
}

/** Body for POST /api/v2/bbps/bills/fetch/request */
export function buildFetchRequest(cfg: BbpsConfig, input: Record<string, unknown>) {
  const billerId = requireString(input, "billerId", { max: 64 });
  const mobile = validateMobile(requireString(input, "mobile"));
  const customerParams = parseCustomerParams(input.customerParams);
  return {
    agent: { id: cfg.agentId, channel: cfg.agentChannel },
    biller: { id: billerId },
    customer: { mobile, customerParams },
  };
}

/** Body for POST /api/v2/bbps/bills/fetch/response */
export function buildFetchResponse(input: Record<string, unknown>) {
  return { refId: requireString(input, "refId", { max: 64 }) };
}

export interface PaymentInput {
  refId: string; // refId returned by the fetch response
  amountRupees: unknown;
  remitterName: string;
  accountInfo: string; // payer's UPI handle, e.g. name@ybl
  custConvFee?: unknown;
  amountMultiple?: number; // from biller metadata, if the biller defines one
}

/** Body for POST /api/v2/bbps/bills/payment/request. amount must be paise. */
export function buildPaymentRequest(input: Record<string, unknown>, now: Date = new Date(), rand?: () => number) {
  const refId = requireString(input, "refId", { max: 64 });
  const remitterName = requireString(input, "remitterName", { max: 100 });
  const accountInfo = requireString(input, "accountInfo", { max: 100 });
  const amount = rupeesToPaise(input.amount);
  const fee = input.custConvFee === undefined ? 0 : rupeesToPaise(input.custConvFee, "custConvFee");
  if (input.custConvFee !== undefined && fee < 0) throw new BbpsInputError("custConvFee cannot be negative");
  return {
    refId,
    paymentDetails: {
      amount,
      mode: "UPI",
      custConvFee: fee,
      paymentRefId: newPaymentRefId(now, rand),
      timestamp: istTimestamp(now),
      accountInfo,
    },
    remitter: { name: remitterName },
  };
}

/** Body for POST /api/v2/bbps/bills/payment/response */
export function buildPaymentResponse(input: Record<string, unknown>) {
  return { refId: requireString(input, "refId", { max: 64 }) };
}

/** Removes secrets from anything we might log or return. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/secret|token|password|authorization/i.test(k)) out[k] = "<redacted>";
      else if (/mobile|accountInfo/i.test(k) && typeof v === "string") out[k] = v.replace(/.(?=.{2})/g, "*");
      else out[k] = redact(v);
    }
    return out;
  }
  return value;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

let tokenCache: { token: string; expiresAt: number; key: string } | null = null;

/** Returns a cached OAuth token for the Setu API, refreshing it 60 s before expiry. */
export async function getSetuToken(cfg: BbpsConfig, doFetch: FetchLike, now = Date.now()): Promise<string> {
  const key = `${cfg.baseUrl}|${cfg.clientId}`;
  if (tokenCache && tokenCache.key === key && tokenCache.expiresAt > now + 60_000) return tokenCache.token;

  const res = await doFetch(`${cfg.baseUrl}/api/v2/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientID: cfg.clientId, secret: cfg.clientSecret }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { token?: string; expiresIn?: number };
    error?: { detail?: string; code?: string };
  };
  if (!res.ok || !json.success || !json.data?.token) {
    throw new Error(`Setu auth failed (${res.status}): ${json.error?.code ?? json.error?.detail ?? "no token returned"}`);
  }
  const ttl = (json.data.expiresIn ?? 1800) * 1000;
  tokenCache = { token: json.data.token, expiresAt: now + ttl, key };
  return json.data.token;
}

export function clearSetuTokenCache() {
  tokenCache = null;
}

/** Calls one Setu BBPS endpoint with auth headers. Returns the parsed JSON body and HTTP status. */
export async function callSetu(
  cfg: BbpsConfig,
  doFetch: FetchLike,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const send = async (token: string) => {
    const res = await doFetch(`${cfg.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-PARTNER-ID": cfg.partnerId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, json };
  };
  let result = await send(await getSetuToken(cfg, doFetch));
  if (result.status === 401) {
    // Token may have been revoked early: drop the cache and retry once.
    clearSetuTokenCache();
    result = await send(await getSetuToken(cfg, doFetch));
  }
  return result;
}
