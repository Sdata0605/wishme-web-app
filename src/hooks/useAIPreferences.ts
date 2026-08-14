import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AIPreferences {
  voice_enabled: boolean;
  auto_open_on_voice: boolean;
  default_minimized: boolean;
  language: string;
}

const DEFAULT_PREFERENCES: AIPreferences = {
  voice_enabled: true,
  auto_open_on_voice: true,
  default_minimized: false,
  language: 'en-US',
};

export const useAIPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AIPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          voice_enabled: data.voice_enabled,
          auto_open_on_voice: data.auto_open_on_voice,
          default_minimized: data.default_minimized,
          language: data.language,
        });
      } else {
        // Create default preferences
        await supabase
          .from('ai_user_preferences')
          .insert({
            user_id: user.id,
            ...DEFAULT_PREFERENCES,
          });
      }
    } catch (error) {
      console.error('Error loading AI preferences:', error);
      console.warn('Failed to load AI preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<AIPreferences>) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('ai_user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          ...updates,
        });

      if (error) throw error;

      setPreferences(prev => ({ ...prev, ...updates }));
      toast.success('Preferences updated');
    } catch (error) {
      console.error('Error updating AI preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, preferences]);

  return {
    preferences,
    isLoading,
    updatePreferences,
    refreshPreferences: loadPreferences,
  };
};
