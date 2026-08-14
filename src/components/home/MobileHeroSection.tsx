import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { deduplicateCelebrities } from "@/lib/utils";
import { Play, Star, Clock, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

interface CelebrityVideo {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
  rating?: number;
  delivery_time?: string;
}

export const MobileHeroSection = () => {
  const { profile } = useAuth();
  const [celebrities, setCelebrities] = useState<CelebrityVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    fetchCelebrities();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchSubscriptions();
    }
  }, [profile?.id]);

  const fetchSubscriptions = async () => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('celebrity_favorites')
        .select('celebrity_id')
        .eq('user_id', profile.id)
        .eq('status', 'active');
      setSubscriptions(data?.map(f => f.celebrity_id) || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    }
  };

  const fetchCelebrities = async () => {
    try {
      const { data: celebData, error } = await supabase
        .from('celebrities')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true)
        .or('consent_status.neq.rejected,consent_status.is.null')
        .order('rating', { ascending: false })
        .limit(6);

      if (error) throw error;

      if (celebData && celebData.length > 0) {
        const { data: mediaData } = await supabase
          .from('celebrity_media')
          .select('*')
          .in('celebrity_id', celebData.map(c => c.id))
          .eq('is_public', true)
          .eq('media_type', 'video');

        const celebsWithVideos = celebData.map((celeb) => {
          const celebMedia = mediaData?.filter(m => m.celebrity_id === celeb.id) || [];
          const videoThumbnail = celebMedia[0]?.thumbnail_url || celeb.image_url;
          
          return {
            id: celeb.id,
            name: celeb.name,
            category: celeb.category,
            thumbnail: videoThumbnail,
            rating: celeb.rating,
            delivery_time: celeb.delivery_time
          };
        });

        setCelebrities(deduplicateCelebrities(celebsWithVideos));
      }
    } catch (error) {
      console.error('Error fetching celebrities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="pt-14 min-h-screen bg-gradient-to-br from-background via-background-secondary to-background">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-14 min-h-[85vh] bg-gradient-to-br from-background via-background-secondary to-background">
      {/* Hero Content */}
      <div className="px-4 pt-8 pb-6">
        {/* Welcome Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 animate-fade-in">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary">Trending Now</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl font-bold leading-tight mb-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Personalized Videos
          </span>
          <br />
          <span className="text-foreground">from Your Favorite</span>
          <br />
          <span className="text-foreground">Celebrities</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Get custom video messages for birthdays, anniversaries, and special moments
        </p>

        {/* CTA Button */}
        <Button 
          size="lg" 
          className="w-full rounded-full bg-gradient-primary text-white shadow-xl h-12 font-semibold animate-fade-in touch-manipulation active:scale-95"
          style={{ animationDelay: '0.3s' }}
          asChild
        >
          <Link to="/celebrities">
            Explore Celebrities
          </Link>
        </Button>
      </div>

      {/* Featured Celebrities Horizontal Scroll */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Featured Stars</h2>
          <Link to="/celebrities" className="text-xs font-medium text-primary">
            View All
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-touch pb-2">
          {[...celebrities].sort((a, b) => {
            const aS = subscriptions.includes(a.id) ? 0 : 1;
            const bS = subscriptions.includes(b.id) ? 0 : 1;
            return aS - bS;
          }).slice(0, 6).map((celeb, index) => (
            <Link 
              key={celeb.id} 
              to={`/celebrity/${celeb.id}`}
              className="flex-shrink-0 w-[140px] animate-fade-in touch-manipulation active:scale-95"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              <Card className="overflow-hidden border-0 shadow-lg bg-card">
                {/* Celebrity Image with Play Overlay */}
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={celeb.thumbnail}
                    alt={celeb.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    </div>
                  </div>

                  {/* Rating Badge */}
                  {celeb.rating && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-semibold text-white">{celeb.rating}</span>
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/90 backdrop-blur-sm">
                    <span className="text-[9px] font-semibold text-white line-clamp-1">
                      {celeb.category}
                    </span>
                  </div>

                  {/* Info at Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white font-semibold text-xs line-clamp-1 mb-0.5">{celeb.name}</p>
                    {celeb.delivery_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-white/80" />
                        <span className="text-[9px] text-white/80">{celeb.delivery_time}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 pb-8">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center border-0 shadow-md bg-card">
            <div className="text-2xl font-bold text-primary mb-1">500+</div>
            <div className="text-[10px] text-muted-foreground">Celebrities</div>
          </Card>
          <Card className="p-4 text-center border-0 shadow-md bg-card">
            <div className="text-2xl font-bold text-primary mb-1">50K+</div>
            <div className="text-[10px] text-muted-foreground">Happy Users</div>
          </Card>
          <Card className="p-4 text-center border-0 shadow-md bg-card">
            <div className="text-2xl font-bold text-primary mb-1">4.8★</div>
            <div className="text-[10px] text-muted-foreground">Avg Rating</div>
          </Card>
        </div>
      </div>
    </section>
  );
};