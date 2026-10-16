import { supabase } from "@/integrations/supabase/client";

/** Tries per order. A busy server or a dropped connection almost always works on the next go. */
const MAX_ATTEMPTS = 3;

/**
 * Places an order through a database function (these save the order and take the money in one step) without ever showing
 * the user a hiccup, the same way the mobile app does:
 *  - a busy server or a dropped connection is retried, up to 3 tries;
 *  - before repeating after a failure that may have got through, `findCreated` looks for the order the first try already
 *    saved, so one order is never paid for twice;
 *  - a real refusal (not enough balance, celebrity unavailable) is shown straight away, with its reason.
 */
export async function placeOrder<T>({
  rpc,
  args,
  findCreated,
}: {
  rpc: string;
  args: Record<string, unknown>;
  /** An order this user already created since `since`, if the earlier try got through. */
  findCreated: (since: string) => Promise<T | null>;
}): Promise<T> {
  const since = new Date(Date.now() - 5_000).toISOString();
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, 1200 * (attempt - 1)));

    const { data, error } = await (supabase as any).rpc(rpc, args);
    if (!error) return data as T;

    lastError = error.message || "Something went wrong.";
    // PostgREST reports a refusal raised by the function as a 4xx with its own message; those will not change on a retry.
    const status = Number((error as any).status ?? 0);
    const transient = !status || status >= 500 || status === 429 || /fetch|network|timeout|JWT expired/i.test(lastError);
    if (!transient) throw new Error(lastError);

    try {
      const done = await findCreated(since);
      if (done) return done;
    } catch {
      // could not check; go round again
    }
  }

  throw new Error(`${lastError} We tried ${MAX_ATTEMPTS} times. Please check My orders before trying again, so you are not charged twice.`);
}
