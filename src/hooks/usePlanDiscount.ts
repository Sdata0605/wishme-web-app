import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface DiscountInfo {
  discountPercentage: number;
  planName: string | null;
  loading: boolean;
  getDiscountedPrice: (basePrice: number) => number;
  getSavingsAmount: (basePrice: number) => number;
}

export function usePlanDiscount(): DiscountInfo {
  const { profile } = useAuth();
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiscount = async () => {
      if (!profile?.plan) {
        setDiscountPercentage(0);
        setPlanName(null);
        setLoading(false);
        return;
      }

      try {
        const { data: planData } = await supabase
          .from('plans')
          .select('service_discount_percentage, name')
          .eq('name', profile.plan)
          .single();

        if (planData?.service_discount_percentage) {
          setDiscountPercentage(planData.service_discount_percentage);
          setPlanName(planData.name);
        } else {
          setDiscountPercentage(0);
          setPlanName(profile.plan);
        }
      } catch (error) {
        console.error('Error fetching plan discount:', error);
        setDiscountPercentage(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscount();
  }, [profile?.plan]);

  const getDiscountedPrice = (basePrice: number): number => {
    if (discountPercentage <= 0) return basePrice;
    return Math.round(basePrice * (1 - discountPercentage / 100));
  };

  const getSavingsAmount = (basePrice: number): number => {
    if (discountPercentage <= 0) return 0;
    return basePrice - getDiscountedPrice(basePrice);
  };

  return {
    discountPercentage,
    planName,
    loading,
    getDiscountedPrice,
    getSavingsAmount
  };
}
