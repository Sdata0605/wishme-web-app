import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleBbps, userIdFromSupabase } from "../_shared/bbpsHandler.ts";

serve((req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  return handleBbps(req, {
    env: (key) => Deno.env.get(key),
    doFetch: (input, init) => fetch(input, init),
    getUserId: (r) => userIdFromSupabase(r, supabaseUrl, (input, init) => fetch(input, init)),
  });
});
