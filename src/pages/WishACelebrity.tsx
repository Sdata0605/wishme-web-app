import { useEffect, useState } from "react";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useSubscribedCelebrities } from "@/hooks/useSubscribedCelebrities";
import { SubscribedCelebrityChips } from "@/components/celebrity/SubscribedCelebrityChips";

interface Celebrity {
  id: string;
  name: string;
  category: string;
  image_url?: string;
  location?: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  service_prices?: { general_wish?: number } | null;
}

/**
 * Wish a Celebrity: pick one of the celebrities you are subscribed to (chips, like the app), then wish them.
 * Celebrities you have not subscribed to are not listed here; subscribe to one from Browse Celebrities.
 */
export default function WishACelebrity() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const subscribed = useSubscribedCelebrities<Celebrity>(
    "id, name, category, image_url, location, rating, review_count, is_verified, service_prices",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const selected = subscribed.celebrities.find((c) => c.id === selectedId) ?? null;

  return (
    <AuthenticatedLayout showSidebar={!!user}>
      <div className="container mx-auto px-4 py-8 pt-20 md:pt-24 mobile-safe-bottom">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Heart className="w-8 h-8 text-primary" />
            Wish a Celebrity
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Send personalized wishes to the celebrities you are subscribed to
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Select Celebrity</h2>
            <SubscribedCelebrityChips<Celebrity>
              celebrities={subscribed.celebrities}
              loading={subscribed.loading}
              hasNone={subscribed.hasNone}
              selectedId={selectedId}
              onSelect={(c) => setSelectedId(c?.id ?? null)}
              priceFor={(c) => c.service_prices?.general_wish ?? null}
              emptyText="Subscribe to a celebrity to send them a wish."
            />
          </div>

          {selected && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted shrink-0">
                    {selected.image_url ? (
                      <img src={selected.image_url} alt={selected.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Star className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{selected.name}</h3>
                      {selected.is_verified && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{selected.category}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{selected.rating || 0}</span>
                    </div>
                  </div>
                </div>
                <Button onClick={() => navigate(`/wish-booking/${selected.id}`)} className="w-full">
                  <Heart className="w-4 h-4 mr-2" />
                  Wish Now
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
