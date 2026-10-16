import { Zap } from "lucide-react";
import { UgcHistory } from "@/components/ugc/UgcHistory";
import { UgcOrderPage } from "@/components/ugc/UgcOrderPage";
import { useUgcOrder } from "@/hooks/useUgcOrder";
import { supabase } from "@/integrations/supabase/client";
import { placeOrder } from "@/lib/placeOrder";
import { UGC_ADS_CONFIG } from "@/lib/ugc/configs";
import { buildDetails, displayValue, type CelebrityLite, type Values } from "@/lib/ugc/types";

export default function UGCAds() {
  const o = useUgcOrder("ugc_ads_price", 999);

  const baseFor = (c: CelebrityLite | null | undefined) => c?.service_prices?.ugc_ad || o.basePrice;
  const getPrice = (v: Values) => o.getDiscountedPrice(baseFor(v.presenter === "celebrity" ? v.celebrity : null));

  const onSubmit = async (v: Values) => {
    const images: string[] = v.images ?? [];
    const ctaField = UGC_ADS_CONFIG.sections[1].fields.find((f) => f.key === "cta")!;
    const cta = v.cta === "custom" ? (v.cta_custom ?? "") : v.cta ? displayValue(ctaField, v.cta) : "";
    const celeb: CelebrityLite | null = v.presenter === "celebrity" ? v.celebrity ?? null : null;

    const order = await placeOrder<{ id: string }>({
      rpc: "create_ugc_ad_order",
      args: {
        p_celebrity_id: celeb?.id ?? null,
        p_product_name: v.product_name ?? "",
        p_product_description: v.product_description ?? "",
        p_product_image_url: images[0] ?? "",
        p_prompt: v.brief ?? "",
        p_hook_style: v.hook_style && v.hook_style !== "auto" ? v.hook_style : "",
        p_call_to_action: cta,
        p_aspect_ratio: v.aspect_ratio ?? "9:16",
        p_details: buildDetails(UGC_ADS_CONFIG, v),
      },
      findCreated: async (since) => {
        const { data } = await supabase
          .from("ugc_ads")
          .select("id")
          .eq("user_id", o.authUid)
          .eq("product_name", String(v.product_name ?? "").trim())
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1);
        return (data?.[0] as { id: string } | undefined) ?? null;
      },
    });
    return { id: order.id };
  };

  return (
    <UgcOrderPage
      config={UGC_ADS_CONFIG}
      initialValues={o.preset ? { presenter: "celebrity", celebrity: o.preset } : undefined}
      title="UGC Ads"
      subtitle="Order a creator-style promo video for your product or brand."
      icon={<Zap className="w-6 h-6" />}
      pills={["Made by our team", "Paid from wallet", "Delivered to My orders"]}
      getPrice={getPrice}
      walletBalance={o.walletBalance}
      onSubmit={onSubmit}
      onPaid={() => void o.refetchWallet()}
      celebrityPrice={(c) => o.getDiscountedPrice(baseFor(c))}
      authUid={o.authUid}
      successTitle="Ad order placed"
      historySlot={(refreshKey, goToNew) => (
        <UgcHistory
          kind="ad"
          gradient={UGC_ADS_CONFIG.gradient}
          accent={UGC_ADS_CONFIG.accent}
          authUid={o.authUid}
          profileId={o.profileId}
          refreshKey={refreshKey}
          onCreate={goToNew}
        />
      )}
    />
  );
}
