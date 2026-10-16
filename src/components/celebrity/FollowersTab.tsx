import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

interface FollowersTabProps {
  celebrityId: string | undefined;
}

/** How many users are subscribed to this celebrity. Only the number: who they are stays private. */
export function FollowersTab({ celebrityId }: FollowersTabProps) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    if (!celebrityId) {
      setLoading(false);
      return;
    }
    const { count: total } = await supabase
      .from("celebrity_favorites")
      .select("id", { count: "exact", head: true })
      .eq("celebrity_id", celebrityId)
      .eq("status", "active");
    setCount(total ?? 0);
    setLoading(false);
  }, [celebrityId]);

  useEffect(() => {
    fetchCount();
    if (!celebrityId) return;
    // Live: a new subscriber updates the number without a refresh.
    const channel = supabase
      .channel(`celebrity-followers-${celebrityId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "celebrity_favorites", filter: `celebrity_id=eq.${celebrityId}` }, () => fetchCount())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [celebrityId, fetchCount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center py-10 gap-2">
        <div className="rounded-full bg-pink-500/10 p-3">
          <Users className="w-7 h-7 text-pink-500" />
        </div>
        <p className="text-5xl font-bold">{count}</p>
        <p className="text-muted-foreground">{count === 1 ? "user has subscribed to you" : "users have subscribed to you"}</p>
      </CardContent>
    </Card>
  );
}
