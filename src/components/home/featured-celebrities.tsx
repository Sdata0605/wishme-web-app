import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { deduplicateCelebrities } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// Static thumbnail mapping for featured celebrities
const celebrityThumbnails: Record<string, string> = {
  'Virat Kohli': '/images/virat-kohli.jpg',
  'Priyanka Chopra': '/images/priyanka-chopra.webp',
  'Deepika Padukone': '/images/deepika-padukone.avif',
  'Shah Rukh Khan': '/images/shah-rukh-khan.webp',
};

// Category color mapping for badges
const categoryColors: Record<string, string> = {
  'Actor': 'from-emerald-500 to-green-600',
  'Singer': 'from-purple-500 to-violet-600',
  'Comedian': 'from-orange-500 to-amber-600',
  'Influencer': 'from-pink-500 to-rose-600',
  'Sports': 'from-cyan-500 to-teal-600',
  'Cricketer': 'from-cyan-500 to-teal-600',
  'Music Composer': 'from-purple-500 to-violet-600',
};

const categoryLabels: Record<string, string> = {
  'Actor': 'BOLLYWOOD ACTOR',
  'Singer': 'LEGENDARY SINGER',
  'Comedian': 'STANDUP COMIC',
  'Influencer': 'TOP INFLUENCER',
  'Sports': 'SPORTS STAR',
  'Cricketer': 'CRICKETER',
  'Music Composer': 'GLOBAL ICON',
};

export function FeaturedCelebrities() {
  const { profile } = useAuth();
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    fetchFeaturedCelebrities();
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

  const fetchFeaturedCelebrities = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true)
        .or('consent_status.neq.rejected,consent_status.is.null')
        .order('rating', { ascending: false })
        .limit(4);

      if (error) throw error;
      setCelebrities(deduplicateCelebrities(data || []));
    } catch (error) {
      console.error('Error fetching celebrities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartingPrice = (celebrity: any) => {
    const prices = celebrity.service_prices;
    if (!prices) return 999;
    const vals = Object.values(prices).filter((v): v is number => typeof v === 'number' && v > 0);
    return vals.length > 0 ? Math.min(...vals) : 999;
  };

  if (loading) {
    return (
      <section className="py-16 lg:py-24 bg-[#0A0E1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  const sorted = [...celebrities].sort((a, b) => {
    const aS = subscriptions.includes(a.id) ? 0 : 1;
    const bS = subscriptions.includes(b.id) ? 0 : 1;
    return aS - bS;
  });

  return (
    <section className="py-8 md:py-16 lg:py-24 bg-[#0A0E1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-6 md:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4">
            <span className="text-white">Featured </span>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Celebrities
            </span>
          </h2>
          <p className="text-sm md:text-lg text-white/50 max-w-2xl mx-auto px-4">
            Choose from our exclusive roster of celebrities ready to create 
            personalized wishes for your special moments.
          </p>
        </div>

        {/* Celebrity Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {sorted.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-white/50">No featured celebrities available at the moment.</p>
            </div>
          ) : (
            sorted.map((celebrity) => {
              const imgSrc = celebrityThumbnails[celebrity.name] || celebrity.image_url || '/placeholder.svg';
              const catColor = categoryColors[celebrity.category] || 'from-primary to-primary/70';
              const catLabel = categoryLabels[celebrity.category] || celebrity.category?.toUpperCase();
              const price = getStartingPrice(celebrity);

              return (
                <Link
                  key={celebrity.id}
                  to={`/celebrity/${celebrity.id}`}
                  className="group block"
                >
                  <div className="relative rounded-2xl overflow-hidden bg-[#141822] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-1.5 active:scale-[0.98] touch-manipulation h-full flex flex-col">
                    {/* Image Container */}
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={imgSrc}
                        alt={celebrity.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141822] via-transparent to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

                      {/* Category Badge - top left */}
                      <div className="absolute top-2 md:top-3 left-2 md:left-3">
                        <span className={`inline-block bg-gradient-to-r ${catColor} text-white text-[8px] md:text-[10px] font-bold uppercase tracking-wider px-2 md:px-2.5 py-0.5 md:py-1 rounded-full shadow-lg`}>
                          {catLabel}
                        </span>
                      </div>

                      {/* Rating Badge - top right */}
                      <div className="absolute top-2 md:top-3 right-2 md:right-3">
                        <div className="flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-1.5 md:px-2 py-0.5 md:py-1">
                          <Star className="w-2.5 h-2.5 md:w-3 md:h-3 text-amber-400 fill-amber-400" />
                          <span className="text-white text-[10px] md:text-xs font-semibold">{celebrity.rating || 4.9}</span>
                        </div>
                      </div>
                    </div>

                    {/* Info Section */}
                    <div className="p-3 md:p-4 flex flex-col flex-1 -mt-4 relative z-10">
                      <h3 className="text-sm md:text-lg font-bold text-white truncate mb-0.5">
                        {celebrity.name}
                      </h3>
                      <p className="text-[10px] md:text-xs text-white/40 mb-2 md:mb-3 truncate">
                        {celebrity.bio ? celebrity.bio.split('.')[0] : celebrity.category}
                      </p>

                      <div className="mt-auto flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[8px] md:text-[10px] text-white/30 uppercase tracking-wider font-medium">Starting at</p>
                          <p className="text-base md:text-xl font-bold bg-gradient-to-r from-primary to-rose-400 bg-clip-text text-transparent">
                            ₹{price.toLocaleString()}
                          </p>
                        </div>
                        <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-rose-500 text-white text-[10px] md:text-xs font-semibold px-3 md:px-4 py-1.5 md:py-2 shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                          Book Now
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* View All Button */}
        <div className="text-center mt-6 md:mt-12">
          <Button 
            variant="outline" 
            size="lg"
            className="border-2 border-white/10 hover:border-primary/50 hover:bg-primary/10 text-white px-8 w-full md:w-auto touch-manipulation active:scale-95"
            asChild
          >
            <Link to="/celebrities">View All Celebrities</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
