import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useAINavigation = () => {
  const navigate = useNavigate();

  const navigateToRoute = useCallback((route: string) => {
    try {
      navigate(route);
      toast.success('Navigating to ' + route);
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Failed to navigate');
    }
  }, [navigate]);

  return { navigateToRoute };
};
