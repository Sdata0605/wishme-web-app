import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, Star } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function DashboardSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [isCelebrity, setIsCelebrity] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCelebrityStatus();
  }, [profile]);

  const checkCelebrityStatus = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('celebrities')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      setIsCelebrity(!!data);
    } catch (error) {
      console.error('Error checking celebrity status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isCelebrity) return null;

  const isCelebrityDashboard = location.pathname === '/celebrity-dashboard';

  return (
    <div className="fixed bottom-36 md:bottom-20 right-4 md:right-6 z-50">
      <Button
        onClick={() => navigate(isCelebrityDashboard ? '/dashboard' : '/celebrity-dashboard')}
        className="shadow-lg"
        size="lg"
      >
        {isCelebrityDashboard ? (
          <>
            <Users className="w-4 h-4 mr-2" />
            User Dashboard
          </>
        ) : (
          <>
            <Star className="w-4 h-4 mr-2" />
            Celebrity Dashboard
          </>
        )}
      </Button>
    </div>
  );
}
