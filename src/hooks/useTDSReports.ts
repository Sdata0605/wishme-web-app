import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TDSStats {
  totalGrossAmount: number;
  totalTDSDeducted: number;
  totalNetAmount: number;
  transactionCount: number;
}

export function useTDSReports(startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<TDSStats>({
    totalGrossAmount: 0,
    totalTDSDeducted: 0,
    totalNetAmount: 0,
    transactionCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchTDSData();
    }
  }, [profile?.id, startDate, endDate]);

  const fetchTDSData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Check if user is celebrity
      const { data: celebrity } = await supabase
        .from('celebrities')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (celebrity) {
        // Fetch celebrity TDS transactions
        let query = supabase
          .from('celebrity_wallet_transactions')
          .select('*')
          .eq('celebrity_id', celebrity.id)
          .not('tds_amount', 'is', null)
          .order('created_at', { ascending: false });

        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
        if (endDate) {
          query = query.lte('created_at', endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;

        setTransactions(data || []);
        calculateStats(data || []);
      } else {
        // Fetch user referral commission TDS (if applicable)
        // For now, just show empty state
        setTransactions([]);
        calculateStats([]);
      }
    } catch (error) {
      console.error('Error fetching TDS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: any[]) => {
    const totals = data.reduce(
      (acc, txn) => ({
        totalGrossAmount: acc.totalGrossAmount + (txn.gross_amount || 0),
        totalTDSDeducted: acc.totalTDSDeducted + (txn.tds_amount || 0),
        totalNetAmount: acc.totalNetAmount + (txn.amount || 0),
        transactionCount: acc.transactionCount + 1
      }),
      { totalGrossAmount: 0, totalTDSDeducted: 0, totalNetAmount: 0, transactionCount: 0 }
    );

    setStats(totals);
  };

  return {
    transactions,
    stats,
    loading,
    refetch: fetchTDSData
  };
}
