import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useCelebritySubscription(celebrityId: string | undefined) {
  const { profile } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  const checkSubscription = async () => {
    if (!profile?.id || !celebrityId) {
      setIsSubscribed(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('celebrity_favorites')
        .select('*')
        .eq('user_id', profile.id)
        .eq('celebrity_id', celebrityId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      
      setIsSubscribed(!!data);
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [profile?.id, celebrityId]);

  return {
    isSubscribed,
    loading,
    subscriptionData,
    checkSubscription
  };
}
