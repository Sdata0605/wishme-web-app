import { supabase } from "@/integrations/supabase/client";

/**
 * The one way the admin screens save a celebrity.
 *
 * Why it exists: both edit screens used to send the whole row they had loaded, which
 *  - overwrote the celebrity's earnings and balance with whatever they were when the page opened,
 *  - sent NaN (an emptied number box) which becomes null and can make the whole save fail,
 *  - reported every failure as a generic "could not update", and
 *  - could "succeed" while saving nothing (a row-level-security refusal returns no error, just no rows).
 * Prices set here are what the mobile app and website charge, so a save that silently does not stick is costly.
 */

/** Columns an admin screen must never write back from a possibly stale copy of the row. */
const NEVER_SENT = new Set([
  "id", "created_at", "updated_at", "profiles", "profile_id",
  "total_earnings", "available_balance", "rating", "review_count",
  "consent_status", "consent_photo_url", "consent_video_url", "consent_given_at",
]);

const PRICE_KEYS = ["general_wish", "image_promotion", "video_promotion", "ugc_ad", "text_message"];

const whole = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};

/** Cleans a celebrity row for saving: no system columns, no NaN, prices and percentages in range. */
export function cleanCelebrityUpdate(values: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(values)) {
    if (NEVER_SENT.has(key) || value === undefined) continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    out[key] = value;
  }

  if ("commission_percentage" in out) {
    const pct = whole(out.commission_percentage);
    if (pct === null) delete out.commission_percentage;
    else out.commission_percentage = Math.min(100, Math.max(0, pct));
  }

  if ("voice_call_price" in out) {
    const price = whole(out.voice_call_price);
    if (price === null) delete out.voice_call_price;
    else out.voice_call_price = Math.max(0, price);
  }

  if (out.service_prices && typeof out.service_prices === "object") {
    const prices: Record<string, any> = { ...out.service_prices };
    for (const key of Object.keys(prices)) {
      const price = whole(prices[key]);
      // An emptied box (NaN) keeps no price rather than saving garbage.
      if (price === null) delete prices[key];
      else prices[key] = Math.max(0, price);
    }
    out.service_prices = prices;
  }
  return out;
}

export interface SaveResult {
  ok: boolean;
  /** Plain-language reason when ok is false. */
  message?: string;
}

/** Saves, then reads the row back to prove the prices and commission really are what was asked for. */
export async function saveCelebrity(celebrityId: string, values: Record<string, any>): Promise<SaveResult> {
  const update = cleanCelebrityUpdate(values);

  // service_prices is replaced as a whole, so merge onto what is stored: a price box left empty
  // keeps its current price instead of deleting it.
  if (update.service_prices) {
    const { data: current } = await (supabase as any)
      .from("celebrities")
      .select("service_prices")
      .eq("id", celebrityId)
      .maybeSingle();
    update.service_prices = { ...(current?.service_prices ?? {}), ...update.service_prices };
  }

  const { data, error } = await (supabase as any)
    .from("celebrities")
    .update(update)
    .eq("id", celebrityId)
    .select("id, service_prices, voice_call_price, commission_percentage");

  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      message: "Nothing was saved: the database refused the change. Make sure you are signed in as the admin account.",
    };
  }

  const saved = data[0];
  if (update.commission_percentage !== undefined && saved.commission_percentage !== update.commission_percentage) {
    return { ok: false, message: "The commission did not save. Please try again." };
  }
  if (update.voice_call_price !== undefined && saved.voice_call_price !== update.voice_call_price) {
    return { ok: false, message: "The voice call price did not save. Please try again." };
  }
  if (update.service_prices) {
    for (const key of PRICE_KEYS) {
      if (update.service_prices[key] !== undefined && saved.service_prices?.[key] !== update.service_prices[key]) {
        return { ok: false, message: `The ${key.replace(/_/g, " ")} price did not save. Please try again.` };
      }
    }
  }
  return { ok: true };
}
