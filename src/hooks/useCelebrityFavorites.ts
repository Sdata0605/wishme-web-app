import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useCelebrityFavorites() {
  const { profile } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchFavorites();
    } else {
      setLoading(false);
    }
  }, [profile?.id]);

  const fetchFavorites = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('celebrity_favorites')
        .select('celebrity_id')
        .eq('user_id', profile.id)
        .eq('status', 'active');

      if (error) throw error;
      setFavorites(data?.map(f => f.celebrity_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasFavorite = (celebrityId: string) => {
    return favorites.includes(celebrityId);
  };

  const refetchFavorites = () => {
    fetchFavorites();
  };

  return {
    favorites,
    hasFavorite,
    loading,
    refetchFavorites
  };
}
