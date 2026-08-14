import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const responseHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse optional filters from body
    let limit = 8;
    let category: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.limit && typeof body.limit === "number") {
          limit = Math.min(Math.max(body.limit, 1), 20);
        }
        if (body.category && typeof body.category === "string") {
          category = body.category;
        }
      } catch {
        // Empty body is fine — use defaults
      }
    }

    // Build celebrity query — select only needed columns (not select("*"))
    let query = supabase
      .from("celebrities")
      .select(
        "id, name, category, bio, image_url, video_thumbnail_url, rating, review_count, followers, location, delivery_time, is_verified, service_prices, voice_call_price, social_media"
      )
      .eq("is_active", true)
      .eq("is_verified", true)
      .or("consent_status.neq.rejected,consent_status.is.null")
      .order("rating", { ascending: false })
      .limit(limit);

    // Optional category filter
    if (category) {
      query = query.eq("category", category);
    }

    const { data: celebrities, error: celebError } = await query;

    if (celebError) {
      throw new Error(`Failed to fetch celebrities: ${celebError.message}`);
    }

    if (!celebrities || celebrities.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: [], total: 0 }),
        { headers: responseHeaders }
      );
    }

    // Collect IDs once
    const celebIds = celebrities.map((c: any) => c.id);

    // Run pricing + occasions queries in parallel
    const [pricingResult, occasionsResult] = await Promise.all([
      supabase
        .from("celebrity_favorite_pricing")
        .select("celebrity_id, price, is_enabled")
        .in("celebrity_id", celebIds),
      supabase
        .from("celebrity_occasions")
        .select("id, celebrity_id, occasion_name, occasion_date, occasion_type")
        .in("celebrity_id", celebIds)
        .eq("is_public", true),
    ]);

    // Build pricing lookup — O(1) per celebrity
    const pricingMap: Record<string, { price: number; is_enabled: boolean }> = {};
    if (pricingResult.data) {
      for (const p of pricingResult.data) {
        pricingMap[p.celebrity_id] = { price: p.price, is_enabled: p.is_enabled };
      }
    }

    // Build occasions lookup — O(1) per celebrity
    const occasionsMap: Record<string, any[]> = {};
    if (occasionsResult.data) {
      for (const o of occasionsResult.data) {
        (occasionsMap[o.celebrity_id] ??= []).push({
          id: o.id,
          occasion_name: o.occasion_name,
          occasion_date: o.occasion_date,
          occasion_type: o.occasion_type,
        });
      }
    }

    // Shape the response — no extra field stripping needed since we selected only needed columns
    const data = celebrities.map((c: any) => {
      const sub = pricingMap[c.id] || { price: 0, is_enabled: false };
      return {
        id: c.id,
        name: c.name,
        category: c.category,
        bio: c.bio,
        image_url: c.image_url,
        video_thumbnail_url: c.video_thumbnail_url,
        rating: c.rating,
        review_count: c.review_count,
        followers: c.followers,
        location: c.location,
        delivery_time: c.delivery_time,
        is_verified: c.is_verified,
        service_prices: c.service_prices,
        voice_call_price: c.voice_call_price,
        social_media: c.social_media,
        subscription: { is_enabled: sub.is_enabled, price: sub.price },
        occasions: occasionsMap[c.id] || [],
      };
    });

    return new Response(
      JSON.stringify({ success: true, data, total: data.length }),
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("get-featured-celebrities error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
