import { createClient } from "npm:@supabase/supabase-js@2";
import { embedTexts, searchTerms, vectorLiteral } from "../_shared/memoryCore.ts";

/**
 * memory-search — finds what the user said before, in chats and in AI calls: by person, by date, by exact words and by meaning.
 *
 *   POST { query?: string, person?: string, days_ago?: number, from?: ISO, to?: ISO, limit?: number }
 *   -> { results: [{ kind: 'chunk' | 'fact', source, person, at, content, via, score }], used: { terms, meaning, from, to } }
 *
 * The search runs as the caller (their own login), so row-level security keeps it to their own data.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Meaning matches further away than this are dropped (0 = identical). Real matches measured 0.31 to 0.41, unrelated ones 0.43 and up. */
const MAX_DISTANCE: number | null = 0.44;

let keyCache: { at: number; key: string } | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const [{ data: { user }, error: authError }, body] = await Promise.all([supabase.auth.getUser(), req.json().catch(() => ({}))]);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const query = String(body?.query ?? "").trim().slice(0, 300);
    const person = String(body?.person ?? "").trim().slice(0, 80) || null;
    const limit = Math.min(Math.max(Number(body?.limit) || 6, 1), 12);

    // A day count means "around that many days ago": a day either side, because people say "four days ago" loosely.
    let from: string | null = null;
    let to: string | null = null;
    const DAY = 86_400_000;
    const asked = body?.days_ago;
    if (asked !== null && asked !== undefined && asked !== "" && Number.isFinite(Number(asked))) {
      const n = Math.max(0, Math.min(Number(asked), 3650));
      from = new Date(Date.now() - (n + 1) * DAY).toISOString();
      to = new Date(n <= 1 ? Date.now() + 3_600_000 : Date.now() - (n - 1) * DAY).toISOString();
    }
    if (body?.from && !Number.isNaN(Date.parse(body.from))) from = new Date(body.from).toISOString();
    if (body?.to && !Number.isNaN(Date.parse(body.to))) to = new Date(body.to).toISOString();

    const terms = searchTerms(query);
    let embedding: string | null = null;
    if (terms.length) {
      const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      if (!keyCache || Date.now() - keyCache.at > 10 * 60_000) {
        const { data } = await db.rpc("ai_secret_get", { p_name: "ai_gemini_api_key" });
        let key = typeof data === "string" ? data : "";
        if (!key) key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_GEMINI_API_KEY") || "";
        keyCache = { at: Date.now(), key };
      }
      if (keyCache.key) {
        try {
          const [v] = await embedTexts(keyCache.key, [query], "RETRIEVAL_QUERY");
          embedding = vectorLiteral(v);
        } catch (e) {
          console.log("memory-search: no embedding, using words only:", e instanceof Error ? e.message : e);
        }
      }
    }

    const { data, error } = await supabase.rpc("memory_recall", {
      p_terms: terms,
      p_embedding: embedding,
      p_person: person,
      p_from: from,
      p_to: to,
      p_limit: limit,
      p_max_distance: Number.isFinite(Number(body?.max_distance)) && body?.max_distance !== null && body?.max_distance !== undefined ? Number(body.max_distance) : MAX_DISTANCE,
    });
    if (error) return json({ error: error.message }, 500);

    const results = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      kind: r.kind,
      source: r.source,
      person: r.person_name,
      at: r.occurred_at,
      content: r.content,
      via: r.via,
      score: Number(Number(r.score).toFixed(4)),
      distance: r.dist === null || r.dist === undefined ? null : Number(Number(r.dist).toFixed(3)),
    }));
    return json({ results, used: { terms, meaning: !!embedding, person, from, to } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "memory-search failed" }, 500);
  }
});
