import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTypingPresenceOptions {
  conversationId: string | null;
  participantId: string | undefined;
  participantType: 'user' | 'celebrity';
}

/**
 * Real-time typing presence using Supabase Realtime channels.
 * Broadcasts typing state so the other party sees live "typing..." dots.
 */
export function useTypingPresence({
  conversationId,
  participantId,
  participantType,
}: UseTypingPresenceOptions) {
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  // Cleanup helper
  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !participantId) return;

    const channelName = `typing-presence-${conversationId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as {
          participantId: string;
          participantType: string;
          isTyping: boolean;
        };

        // Only react to the OTHER participant's typing
        if (data.participantType !== participantType) {
          setOtherIsTyping(data.isTyping);

          // Auto-clear after 4s if no further "typing" events arrive
          clearTypingTimeout();
          if (data.isTyping) {
            typingTimeoutRef.current = window.setTimeout(() => {
              setOtherIsTyping(false);
            }, 4000);
          }
        }
      })
      .subscribe();

    return () => {
      clearTypingTimeout();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, participantId, participantType, clearTypingTimeout]);

  /**
   * Call this on every keystroke in the message input.
   * Throttled to broadcast at most once per 2 seconds.
   */
  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !participantId) return;

    const now = Date.now();
    if (now - lastBroadcastRef.current < 2000) return; // throttle
    lastBroadcastRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { participantId, participantType, isTyping: true },
    });
  }, [participantId, participantType]);

  /**
   * Call this when the user sends a message or clears the input.
   */
  const stopTyping = useCallback(() => {
    if (!channelRef.current || !participantId) return;

    lastBroadcastRef.current = 0; // reset throttle
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { participantId, participantType, isTyping: false },
    });
  }, [participantId, participantType]);

  return { otherIsTyping, broadcastTyping, stopTyping };
}
