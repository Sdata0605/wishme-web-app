// Request handler for the `bbps` edge function. Dependencies are injected so the same
// logic runs in Deno (edge function) and in Node tests with a mocked Setu API.
import {
  BbpsInputError,
  type BbpsConfig,
  buildFetchRequest,
  buildFetchResponse,
  buildPaymentRequest,
  buildPaymentResponse,
  callSetu,
  type FetchLike,
  readBbpsConfig,
  rupeesToPaise,
  redact,
} from "./bbps.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export interface BbpsDeps {
  env: (key: string) => string | undefined;
  doFetch: FetchLike;
  /** Resolves the Supabase user id for the request's bearer token, or null when it is not a user login. */
  getUserId: (req: Request) => Promise<string | null>;
  now?: () => Date;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Actions that move money or change state require a signed-in user. Read-only lists do too, to keep the API closed. */
const ACTIONS = new Set([
  "health",
  "categories",
  "billers",
  "fetch_request",
  "fetch_response",
  "pay_request",
  "pay_response",
  "disputes",
]);

export async function handleBbps(req: Request, deps: BbpsDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: { code: "METHOD_NOT_ALLOWED" } });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { success: false, error: { code: "BAD_JSON", detail: "Body must be JSON" } });
  }

  const action = typeof body.action === "string" ? body.action : "";
  if (!ACTIONS.has(action)) {
    return json(400, { success: false, error: { code: "UNKNOWN_ACTION", detail: `Unknown action "${action}"` } });
  }

  const cfgOrMissing = readBbpsConfig(deps.env);
  if ("missing" in cfgOrMissing) {
    if (action === "health") {
      return json(200, { success: true, data: { configured: false, missing: cfgOrMissing.missing } });
    }
    return json(503, {
      success: false,
      error: { code: "NOT_CONFIGURED", detail: `Missing secrets: ${cfgOrMissing.missing.join(", ")}` },
    });
  }
  const cfg: BbpsConfig = cfgOrMissing;

  if (action === "health") {
    return json(200, { success: true, data: { configured: true, baseUrl: cfg.baseUrl, agentChannel: cfg.agentChannel } });
  }

  const userId = await deps.getUserId(req);
  if (!userId) return json(401, { success: false, error: { code: "UNAUTHORIZED", detail: "Sign in first" } });

  try {
    let setu: { status: number; json: Record<string, unknown> };

    switch (action) {
      case "categories":
        setu = await callSetu(cfg, deps.doFetch, "GET", "/api/v2/bbps/categories");
        break;

      case "billers": {
        const category = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
        const qs = category ? `?categoryId=${encodeURIComponent(category)}` : "";
        setu = await callSetu(cfg, deps.doFetch, "GET", `/api/v2/bbps/billers${qs}`);
        break;
      }

      case "fetch_request":
        setu = await callSetu(cfg, deps.doFetch, "POST", "/api/v2/bbps/bills/fetch/request", buildFetchRequest(cfg, body));
        break;

      case "fetch_response":
        setu = await callSetu(cfg, deps.doFetch, "POST", "/api/v2/bbps/bills/fetch/response", buildFetchResponse(body));
        break;

      case "pay_request": {
        const maxRupees = Number(deps.env("BBPS_MAX_PAYMENT_RUPEES") || "10000");
        const paise = rupeesToPaise(body.amount);
        if (paise / 100 > maxRupees) {
          throw new BbpsInputError(`amount exceeds the per-payment limit of ₹${maxRupees}`);
        }
        const payload = buildPaymentRequest(body, deps.now?.() ?? new Date());
        setu = await callSetu(cfg, deps.doFetch, "POST", "/api/v2/bbps/bills/payment/request", payload);
        break;
      }

      case "pay_response":
        setu = await callSetu(cfg, deps.doFetch, "POST", "/api/v2/bbps/bills/payment/response", buildPaymentResponse(body));
        break;

      case "disputes":
        setu = await callSetu(cfg, deps.doFetch, "GET", "/api/v2/bbps/disputes");
        break;

      default:
        throw new BbpsInputError("unreachable");
    }

    const ok = setu.status >= 200 && setu.status < 300 && setu.json.success !== false;
    if (!ok) {
      return json(502, {
        success: false,
        error: { code: "SETU_ERROR", upstreamStatus: setu.status, detail: redact(setu.json) },
      });
    }
    return json(200, { success: true, data: setu.json.data ?? setu.json });
  } catch (err) {
    if (err instanceof BbpsInputError) {
      return json(400, { success: false, error: { code: "INVALID_INPUT", detail: err.message } });
    }
    const message = err instanceof Error ? err.message : String(err);
    return json(502, { success: false, error: { code: "UPSTREAM_FAILURE", detail: message } });
  }
}

/** Resolves the user id by asking Supabase Auth; anon keys and missing tokens resolve to null. */
export async function userIdFromSupabase(req: Request, supabaseUrl: string, doFetch: FetchLike): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  try {
    const res = await doFetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: auth } });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return typeof user.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}
