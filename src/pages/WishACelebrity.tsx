import { useState, useEffect } from "react";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Heart, Search, Star, CheckCircle, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Celebrity {
  id: string;
  name: string;
  category: string;
  image_url?: string;
  location?: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
}

export default function WishACelebrity() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadingSubscriptions(true);
      
      // Fetch all active celebrities
      const { data: celebData, error: celebError } = await supabase
        .from('celebrities')
        .select('*')
        .eq('is_active', true)
        .or('consent_status.neq.rejected,consent_status.is.null')
        .order('name');

      if (celebError) throw celebError;
      setCelebrities(celebData || []);
      setLoading(false);

      // Fetch user's subscriptions
      if (profile?.id) {
        const { data: favData, error: favError } = await supabase
          .from('celebrity_favorites')
          .select('celebrity_id')
          .eq('user_id', profile.id)
          .eq('status', 'active');

        if (favError) throw favError;
        setSubscriptions(favData?.map(f => f.celebrity_id) || []);
      }
      setLoadingSubscriptions(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load celebrities",
        variant: "destructive"
      });
      setLoading(false);
      setLoadingSubscriptions(false);
    }
  };

  const isSubscribed = (celebrityId: string) => {
    return subscriptions.includes(celebrityId);
  };

  const handleWishNow = (celebrityId: string) => {
    navigate(`/wish-booking/${celebrityId}`);
  };

  const handleSubscribe = (celebrityId: string) => {
    navigate(`/celebrity/${celebrityId}`);
  };

  const filteredCelebrities = celebrities.filter(celeb =>
    celeb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    celeb.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort: subscribed first, then unsubscribed
  const sortedCelebrities = [...filteredCelebrities].sort((a, b) => {
    const aSubscribed = isSubscribed(a.id);
    const bSubscribed = isSubscribed(b.id);
    if (aSubscribed && !bSubscribed) return -1;
    if (!aSubscribed && bSubscribed) return 1;
    return 0;
  });

  if (loading) {
    return (
      <AuthenticatedLayout showSidebar={!!user}>
        <div className="container mx-auto px-4 py-8 pt-20 md:pt-24 mobile-safe-bottom">
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground animate-pulse">Loading celebrities...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout showSidebar={!!user}>
      <div className="container mx-auto px-4 py-8 pt-20 md:pt-24 mobile-safe-bottom">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Heart className="w-8 h-8 text-primary" />
            Wish a Celebrity
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Send personalized wishes to your favorite celebrities on their special occasions
          </p>
        </div>

        {/* Search */}
        <div className="mb-6 relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search celebrities..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Subscribed Celebrities Section */}
        {subscriptions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Subscribed Celebrities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {sortedCelebrities
                .filter(celeb => isSubscribed(celeb.id))
                .map((celebrity) => (
                  <Card key={celebrity.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted">
                          {celebrity.image_url ? (
                            <img 
                              src={celebrity.image_url} 
                              alt={celebrity.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Star className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{celebrity.name}</h3>
                            {celebrity.is_verified && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{celebrity.category}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{celebrity.rating || 0}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleWishNow(celebrity.id)}
                        className="w-full"
                        disabled={loadingSubscriptions}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        {loadingSubscriptions ? 'Loading...' : 'Wish Now'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Browse More Celebrities */}
        {sortedCelebrities.filter(celeb => !isSubscribed(celeb.id)).length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              Browse More Celebrities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {sortedCelebrities
                .filter(celeb => !isSubscribed(celeb.id))
                .map((celebrity) => (
                  <Card key={celebrity.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted">
                          {celebrity.image_url ? (
                            <img 
                              src={celebrity.image_url} 
                              alt={celebrity.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Star className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{celebrity.name}</h3>
                            {celebrity.is_verified && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{celebrity.category}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{celebrity.rating || 0}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleSubscribe(celebrity.id)}
                        variant="outline"
                        className="w-full"
                        disabled={loadingSubscriptions}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        {loadingSubscriptions ? 'Loading...' : 'Subscribe to Wish'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {sortedCelebrities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No celebrities found matching your search.</p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
