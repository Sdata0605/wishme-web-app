import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type AnalyticsAction = 
  | 'message_sent' 
  | 'voice_used' 
  | 'action_clicked' 
  | 'suggestion_clicked' 
  | 'conversation_exported';

export const useAIAnalytics = () => {
  const { user } = useAuth();

  const trackAction = useCallback(async (
    actionType: AnalyticsAction,
    conversationId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user?.id) return;

    try {
      await supabase.from('ai_usage_analytics').insert({
        user_id: user.id,
        conversation_id: conversationId,
        action_type: actionType,
        metadata: metadata || {},
      });
    } catch (error) {
      console.error('Error tracking analytics:', error);
      // Don't show error to user for analytics
    }
  }, [user?.id]);

  return { trackAction };
};
