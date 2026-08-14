import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReviewsTabProps {
  celebrityId?: string;
}

interface Review {
  id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
  bookings?: {
    service_type?: string;
  };
}

export function ReviewsTab({ celebrityId }: ReviewsTabProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (celebrityId) {
      fetchReviews(celebrityId);
    } else {
      setLoading(false);
    }
  }, [celebrityId]);

  const fetchReviews = async (cid: string) => {
    try {
      const { data, error } = await supabase
        .from('celebrity_reviews')
        .select('*, bookings:booking_id(service_type)')
        .eq('celebrity_id', cid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user details separately
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const reviewData: Review[] = (data || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        review_text: r.review_text,
        created_at: r.created_at,
        profiles: profilesMap.get(r.user_id),
        bookings: r.bookings,
      }));

      setReviews(reviewData);
      if (reviewData.length > 0) {
        const avg = reviewData.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewData.length;
        setAverageRating(Math.round(avg * 10) / 10);
      } else {
        setAverageRating(0);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({ title: "Error", description: "Failed to load reviews", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  if (!celebrityId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Sign up as a celebrity to receive reviews.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rating Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold">{averageRating}</p>
              <div className="flex items-center gap-1 mt-2">
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No reviews yet</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">
                        {review.profiles?.first_name || 'Anonymous'} {review.profiles?.last_name || ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating || 0)}
                        </div>
                        {review.bookings?.service_type && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {review.bookings.service_type.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-muted-foreground mt-2">{review.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

