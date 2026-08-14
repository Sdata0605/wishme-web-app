import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Conversation {
  id: string;
  user_id: string;
  celebrity_id: string;
  created_at: string;
  last_message_at: string;
  unread_count_user: number;
  unread_count_celebrity: number;
  message_count?: number;
  is_closed?: boolean;
  closed_reason?: string;
  closed_at?: string;
  celebrity?: {
    id: string;
    name: string;
    image_url: string;
  };
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  last_message?: {
    message_text: string;
    sender_type: string;
  };
}

export function useConversations() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    fetchConversations();

    // Subscribe to real-time updates for conversations
    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${profile.id}`
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    // Subscribe to real-time updates for messages to refresh conversation list
    const messagesChannel = supabase
      .channel('messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchConversations(); // Refresh to get latest message
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [profile?.id]);

  const fetchConversations = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          celebrity:celebrities!conversations_celebrity_id_fkey(id, name, image_url),
          user:profiles!conversations_user_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('user_id', profile.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Fetch last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('message_text, sender_type')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            last_message: lastMsg || undefined
          };
        })
      );

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!profile?.id) return;

    try {
      await supabase
        .from('conversations')
        .update({ unread_count_user: 0 })
        .eq('id', conversationId);

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false);

      fetchConversations();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  return {
    conversations,
    loading,
    markAsRead,
    refetch: fetchConversations
  };
}
