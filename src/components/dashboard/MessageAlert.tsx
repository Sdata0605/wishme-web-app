import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export function MessageAlert() {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    fetchUnreadCount();

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${profile.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const fetchUnreadCount = async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('conversations')
      .select('unread_count_user')
      .eq('user_id', profile.id);

    const total = data?.reduce((sum, conv) => sum + conv.unread_count_user, 0) || 0;
    setUnreadCount(total);
  };

  if (unreadCount === 0) return null;

  return (
    <Badge variant="destructive" className="h-5 min-w-[20px] rounded-full px-1.5 flex items-center justify-center text-xs font-semibold">
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}
