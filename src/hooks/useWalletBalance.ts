import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useWalletBalance() {
  const { profile } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    // Initial fetch
    fetchBalance();

    // Real-time subscription
    const channel = supabase
      .channel('wallet-balance-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profile.id}`
      }, (payload) => {
        if (payload.new && 'wallet_balance' in payload.new) {
          setBalance((payload.new as any).wallet_balance);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const fetchBalance = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', profile.id)
        .single();
      
      if (error) throw error;
      setBalance(data.wallet_balance || 0);
    } finally {
      setLoading(false);
    }
  };

  return { balance, loading, refetch: fetchBalance };
}
