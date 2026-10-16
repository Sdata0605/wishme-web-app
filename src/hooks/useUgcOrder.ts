import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";
import type { CelebrityLite } from "@/lib/ugc/types";

/** What both UGC order pages need: the wallet, the plan discount, the platform's base price and a celebrity opened from their profile. */
export function useUgcOrder(settingKey: string, defaultPrice: number) {
  const { user, profile } = useAuth();
  const { balance, refetch } = useWalletBalance();
  const { getDiscountedPrice } = usePlanDiscount();
  const [basePrice, setBasePrice] = useState(defaultPrice);
  const [searchParams] = useSearchParams();
  const celebrityParam = searchParams.get("celebrity");
  const [preset, setPreset] = useState<CelebrityLite | null>(null);

  useEffect(() => { void refetch(); }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", settingKey)
      .limit(1)
      .then(({ data }) => {
        const v = parseInt(String((data as any)?.[0]?.setting_value ?? ""), 10);
        if (v > 0) setBasePrice(v);
      });
  }, [settingKey]);

  useEffect(() => {
    if (!celebrityParam) return;
    supabase
      .from("celebrities")
      .select("id, name, category, image_url, service_prices")
      .eq("id", celebrityParam)
      .maybeSingle()
      .then(({ data }) => { if (data) setPreset(data as unknown as CelebrityLite); });
  }, [celebrityParam]);

  return {
    authUid: user?.id ?? "",
    profileId: profile?.id ?? "",
    firstName: profile?.first_name ?? "",
    walletBalance: balance,
    refetchWallet: refetch,
    getDiscountedPrice,
    basePrice,
    preset,
  };
}
