import { Video } from "lucide-react";
import { UgcHistory } from "@/components/ugc/UgcHistory";
import { UgcOrderPage } from "@/components/ugc/UgcOrderPage";
import { useUgcOrder } from "@/hooks/useUgcOrder";
import { supabase } from "@/integrations/supabase/client";
import { placeOrder } from "@/lib/placeOrder";
import { UGC_VIDEOS_CONFIG } from "@/lib/ugc/configs";
import { buildDetails, displayValue, type CelebrityLite, type Values } from "@/lib/ugc/types";

const fieldOf = (sectionKey: string, key: string) =>
  UGC_VIDEOS_CONFIG.sections.find((s) => s.key === sectionKey)!.fields.find((f) => f.key === key)!;

export default function UGCVideos() {
  const o = useUgcOrder("ugc_video_price", 500);

  const baseFor = (c: CelebrityLite) => c.service_prices?.ugc_ad || o.basePrice;
  const getPrice = (v: Values) => (v.celebrity ? o.getDiscountedPrice(baseFor(v.celebrity as CelebrityLite)) : null);

  const onSubmit = async (v: Values) => {
    const celeb = v.celebrity as CelebrityLite;
    const forMe = v.for_whom === "me";
    const photos: string[] = v.photos ?? [];

    const order = await placeOrder<{ id: string }>({
      rpc: "create_wish_friend_order",
      args: {
        p_order_type: "ugc_video",
        p_celebrity_id: celeb.id,
        p_recipient_name: forMe ? (o.firstName || "Me") : (v.name ?? ""),
        p_occasion: displayValue(fieldOf("who", "occasion"), v.occasion),
        p_relationship: !forMe && v.relationship ? displayValue(fieldOf("who", "relationship"), v.relationship) : "",
        p_tone: Array.isArray(v.tone) ? displayValue(fieldOf("style", "tone"), v.tone) : "",
        p_prompt: v.message ?? "",
        p_aspect_ratio: v.aspect_ratio ?? "9:16",
        p_hook_style: "",
        p_call_to_action: "",
        p_reference_image_url: photos[0] ?? "",
        p_details: buildDetails(UGC_VIDEOS_CONFIG, v),
      },
      findCreated: async (since) => {
        const { data } = await (supabase as any)
          .from("wish_friend_orders")
          .select("id")
          .eq("user_id", o.profileId)
          .eq("order_type", "ugc_video")
          .eq("celebrity_id", celeb.id)
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
      config={UGC_VIDEOS_CONFIG}
      initialValues={o.preset ? { celebrity: o.preset } : undefined}
      title="UGC Videos"
      subtitle="A personal, creator-style video with a celebrity, made for someone you care about."
      icon={<Video className="w-6 h-6" />}
      pills={["Made by our team", "Paid from wallet", "Delivered to My orders"]}
      getPrice={getPrice}
      walletBalance={o.walletBalance}
      onSubmit={onSubmit}
      onPaid={() => void o.refetchWallet()}
      celebrityPrice={(c) => o.getDiscountedPrice(baseFor(c))}
      authUid={o.authUid}
      successTitle="Video order placed"
      historySlot={(refreshKey, goToNew) => (
        <UgcHistory
          kind="video"
          gradient={UGC_VIDEOS_CONFIG.gradient}
          accent={UGC_VIDEOS_CONFIG.accent}
          authUid={o.authUid}
          profileId={o.profileId}
          refreshKey={refreshKey}
          onCreate={goToNew}
        />
      )}
    />
  );
}
