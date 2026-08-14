import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'celebrity';
  message_text: string;
  is_read: boolean;
  is_ai_generated: boolean;
  created_at: string;
  conversation_message_number?: number;
}

export function useMessages(conversationId: string | null) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messageLimit, setMessageLimit] = useState<number>(200);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const typingFallbackRef = useRef<number | null>(null);
  const autoReplyFallbackRef = useRef<number | null>(null);

  // Stable ref for profile id — prevents effect re-runs on profile object reference changes
  const profileIdRef = useRef(profile?.id);
  profileIdRef.current = profile?.id;

  // Stable ref for isTyping so cleanup doesn't reset it
  const isTypingRef = useRef(false);
  const setTyping = useCallback((value: boolean) => {
    isTypingRef.current = value;
    setIsTyping(value);
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !profileIdRef.current) return;

    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('message_count, is_closed')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      
      setMessageCount(convData?.message_count || 0);
      setIsClosed(convData?.is_closed || false);

      const { data: limitData } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'conversation_message_limit')
        .single();

      setMessageLimit(parseInt(limitData?.setting_value || '200'));

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const reversed = (data || []).reverse();
      setMessages(reversed as Message[]);
      setHasMoreMessages((data || []).length >= 50);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !profileIdRef.current) {
      setLoading(false);
      return;
    }

    fetchMessages();

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          if (newMessage.sender_type === 'celebrity') {
            if (typingFallbackRef.current) {
              clearTimeout(typingFallbackRef.current);
              typingFallbackRef.current = null;
            }
            if (autoReplyFallbackRef.current) {
              clearTimeout(autoReplyFallbackRef.current);
              autoReplyFallbackRef.current = null;
            }
            setTyping(false);
          }
          
          setMessages((prev) => {
            const filtered = prev.filter(m => !m.id.startsWith('temp-'));
            if (filtered.some(m => m.id === newMessage.id)) {
              return filtered;
            }
            return [...filtered, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Do NOT reset isTyping on cleanup — prevents the flash bug
    };
  }, [conversationId, fetchMessages, setTyping]);

  const fetchOlderMessages = async () => {
    if (!conversationId || !hasMoreMessages || loadingOlder || messages.length === 0) return;

    setLoadingOlder(true);
    try {
      const oldestMessage = messages[0];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const olderMessages = data.reverse();
        setMessages((prev) => [...olderMessages as Message[], ...prev]);
        setHasMoreMessages(data.length >= 30);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error fetching older messages:', error);
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async (messageText: string) => {
    const currentProfileId = profileIdRef.current;
    if (!conversationId || !currentProfileId || !messageText.trim()) return;

    setSending(true);
    
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentProfileId,
      sender_type: 'user',
      message_text: messageText.trim(),
      is_read: false,
      is_ai_generated: false,
      created_at: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
    
    try {
      const { data: insertedMessage, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentProfileId,
        sender_type: 'user',
        message_text: messageText.trim(),
        is_read: false,
        is_ai_generated: false
      }).select().single();

      if (error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));
        throw error;
      }

      setMessages((prev) => prev.map(m => m.id === optimisticMessage.id ? insertedMessage as Message : m));

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      // Increment unread count using RPC or direct query
      const { data: conv } = await supabase
        .from('conversations')
        .select('unread_count_celebrity')
        .eq('id', conversationId)
        .single();
      
      if (conv) {
        await supabase
          .from('conversations')
          .update({
            unread_count_celebrity: conv.unread_count_celebrity + 1
          })
          .eq('id', conversationId);
      }

      // Always show typing indicator after sending — cleared when celebrity reply arrives via realtime
      setTyping(true);
      typingFallbackRef.current = window.setTimeout(() => {
        setTyping(false);
        typingFallbackRef.current = null;
      }, 30000); // 30s safety fallback

      // Secondary fallback: refetch messages if realtime missed the reply
      autoReplyFallbackRef.current = window.setTimeout(() => {
        fetchMessages();
        autoReplyFallbackRef.current = null;
      }, 25000);

    } catch (error) {
      console.error('Error sending message:', error);
      if (typingFallbackRef.current) {
        clearTimeout(typingFallbackRef.current);
        typingFallbackRef.current = null;
      }
      if (autoReplyFallbackRef.current) {
        clearTimeout(autoReplyFallbackRef.current);
        autoReplyFallbackRef.current = null;
      }
      setTyping(false);
      throw error;
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    loading,
    sending,
    isTyping,
    hasMoreMessages,
    loadingOlder,
    messageLimit,
    messageCount,
    isClosed,
    sendMessage,
    fetchOlderMessages,
    refetch: fetchMessages
  };
}
