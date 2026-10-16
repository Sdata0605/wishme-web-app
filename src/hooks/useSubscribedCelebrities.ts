import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCelebrityFavorites } from "@/hooks/useCelebrityFavorites";

/**
 * The celebrities the signed-in user has subscribed to, and only those. Every service that asks
 * "which celebrity?" uses this, so nobody can be picked without a subscription.
 *
 * `columns` is the column list the page needs, e.g. "id, name, category, service_prices".
 */
export function useSubscribedCelebrities<T extends { id: string }>(columns: string) {
  const { favorites, loading: favoritesLoading } = useCelebrityFavorites();
  const [celebrities, setCelebrities] = useState<T[]>([]);
  const [fetching, setFetching] = useState(false);

  const idKey = [...favorites].sort().join(",");

  useEffect(() => {
    if (favoritesLoading) return;
    if (!idKey) {
      setCelebrities([]);
      return;
    }
    let cancelled = false;
    setFetching(true);
    (async () => {
      const { data } = await supabase
        .from("celebrities")
        .select(columns)
        .in("id", idKey.split(","))
        .eq("is_active", true)
        .or("consent_status.neq.rejected,consent_status.is.null")
        .order("name");
      if (!cancelled) {
        setCelebrities((data as unknown as T[]) ?? []);
        setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [favoritesLoading, idKey, columns]);

  return {
    celebrities,
    loading: favoritesLoading || fetching,
    /** The user has no active subscription at all. */
    hasNone: !favoritesLoading && favorites.length === 0,
  };
}
