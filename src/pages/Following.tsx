import { useState, useEffect } from "react";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Search, Star, CheckCircle, IndianRupee, Sparkles, Video, Image as ImageIcon, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { supabase } from "@/integrations/supabase/client";
import { deduplicateCelebrities } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { ServiceGuide } from "@/components/ui/service-guide";
import { followingGuide } from "@/data/service-guides";

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

interface FavoritePricing {
  celebrity_id: string;
  price: number;
  referrer_commission_percentage: number;
  celebrity_commission_percentage: number;
  is_enabled: boolean;
}

interface UserFavorite {
  id: string;
  celebrity_id: string;
  price_paid: number;
  created_at: string;
  celebrities: Celebrity;
}

export default function Following() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { balance: walletBalance, refetch: refetchBalance } = useWalletBalance();
  
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [pricing, setPricing] = useState<FavoritePricing[]>([]);
  const [userFavorites, setUserFavorites] = useState<UserFavorite[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [selectedCelebrity, setSelectedCelebrity] = useState<Celebrity | null>(null);
  const [selectedPricing, setSelectedPricing] = useState<FavoritePricing | null>(null);

  useEffect(() => {
    if (user) {
      fetchCelebrities();
      fetchUserFavorites();
    }
  }, [user]);

  const fetchCelebrities = async () => {
    try {
      setLoading(true);
      
      const { data: celebData, error: celebError } = await supabase
        .from('celebrities')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (celebError) throw celebError;

      const { data: pricingData, error: pricingError } = await supabase
        .from('celebrity_favorite_pricing')
        .select('*')
        .eq('is_enabled', true);

      if (pricingError) throw pricingError;

      setCelebrities(deduplicateCelebrities(celebData || []));
      setPricing(pricingData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load celebrities",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFavorites = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('celebrity_favorites')
        .select(`*, celebrities (*)`)
        .eq('user_id', profile.id)
        .eq('status', 'active');

      if (error) throw error;
      setUserFavorites(data || []);
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
    }
  };

  const handleAddToFavorites = async (celebrity: Celebrity) => {
    if (!profile?.id) {
      toast({ title: "Authentication Required", description: "Please log in to add favorites", variant: "destructive" });
      return;
    }

    const celebrityPricing = pricing.find(p => p.celebrity_id === celebrity.id);
    if (!celebrityPricing) {
      navigate(`/celebrity/${celebrity.id}`);
      return;
    }

    setSelectedCelebrity(celebrity);
    setSelectedPricing(celebrityPricing);
    setShowPaymentSelector(true);
  };

  const handleWalletPayment = async () => {
    if (!profile?.id || !selectedCelebrity || !selectedPricing) return;

    try {
      setProcessingPayment(selectedCelebrity.id);

      // Use atomic server-side RPC — no client-side wallet debit
      const { data, error } = await supabase.rpc('purchase_celebrity_subscription', {
        p_celebrity_id: selectedCelebrity.id,
        p_price: selectedPricing.price,
        p_payment_method: 'wallet'
      });

      if (error) throw error;

      // Send email notification (fire-and-forget)
      const subscriberName = profile?.first_name && profile?.last_name 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile?.email || 'A new fan';
      
      supabase.functions.invoke('send-celebrity-subscription-email', {
        body: {
          celebrity_id: selectedCelebrity.id,
          subscriber_name: subscriberName,
          subscriber_email: profile?.email,
          price_paid: selectedPricing.price
        }
      }).catch(err => console.error('Email notification failed:', err));

      await Promise.all([fetchUserFavorites(), refetchBalance()]);
      
      toast({
        title: "Success! 🎉",
        description: `You can now use ${selectedCelebrity.name} for UGC videos, wishes, and promotions!`
      });

      setShowPaymentSelector(false);
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Could not process subscription",
        variant: "destructive"
      });
      throw error;
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!profile?.id || !selectedCelebrity || !selectedPricing) return;

    setProcessingPayment(selectedCelebrity.id);

    try {
      const timestamp = Date.now().toString().slice(-8);
      const userShort = profile.id.slice(0, 8);
      const receipt = `fav_${timestamp}_${userShort.slice(0, 6)}`;
      
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: selectedPricing.price,
          currency: 'INR',
          receipt: receipt,
          notes: {
            user_id: profile.id,
            celebrity_id: selectedCelebrity.id,
            type: 'celebrity_favorite'
          }
        }
      });

      if (orderError) throw orderError;

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Celebrity Favorites',
        description: `Subscribe to ${selectedCelebrity.name}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          // After Razorpay success, use atomic RPC with razorpay payment method
          try {
            const { error } = await supabase.rpc('purchase_celebrity_subscription', {
              p_celebrity_id: selectedCelebrity!.id,
              p_price: selectedPricing!.price,
              p_payment_method: 'razorpay'
            });
            if (error) throw error;

            await Promise.all([fetchUserFavorites(), refetchBalance()]);
            toast({
              title: "Success! 🎉",
              description: `You can now use ${selectedCelebrity!.name} for UGC videos, wishes, and promotions!`
            });
            setShowPaymentSelector(false);
          } catch (err: any) {
            toast({ title: "Subscription Error", description: err.message, variant: "destructive" });
          }
          setProcessingPayment(null);
        },
        prefill: {
          name: `${profile.first_name || ''} ${profile.last_name || ''}`,
          email: profile.email,
          contact: profile.phone || ''
        },
        theme: { color: '#3B82F6' },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",
                instruments: [{ method: "upi", flows: ["collect", "intent", "qr"] }]
              }
            },
            sequence: ["block.upi", "block.other"],
            preferences: { show_default_blocks: true }
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
      razorpay.on('payment.failed', function (response: any) {
        toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" });
        setProcessingPayment(null);
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not process payment", variant: "destructive" });
      setProcessingPayment(null);
      throw error;
    }
  };

  const filteredCelebrities = celebrities
    .filter(celeb =>
      celeb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      celeb.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aFav = isFavorite(a.id) ? 0 : 1;
      const bFav = isFavorite(b.id) ? 0 : 1;
      return aFav - bFav;
    });

  const isFavorite = (celebrityId: string) => userFavorites.some(fav => fav.celebrity_id === celebrityId);
  const getCelebrityPrice = (celebrityId: string) => pricing.find(p => p.celebrity_id === celebrityId)?.price || null;
  const hasPricing = (celebrityId: string) => pricing.some(p => p.celebrity_id === celebrityId);

  if (loading) {
    return (
      <AuthenticatedLayout showSidebar={!!user}>
        <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 pt-20 md:pt-24 mobile-safe-bottom">
          <div className="text-center">
            <p className="text-muted-foreground">Loading celebrities...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout showSidebar={!!user}>
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 pt-20 md:pt-24 mobile-safe-bottom">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Celebrity Favorites
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Subscribe to your favorite celebrities for lifetime access to UGC videos, wishes, and promotions
          </p>
        </div>

        <ServiceGuide {...followingGuide} className="mb-6" />

        {/* Tabs */}
        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="browse">
              <Search className="w-4 h-4 mr-2" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="my-favorites">
              <Heart className="w-4 h-4 mr-2" />
              My Favorites ({userFavorites.length})
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-6">
            <div className="mb-6 relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search celebrities..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl bg-card/50 border-0 h-12"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredCelebrities.map((celebrity) => {
                const isFav = isFavorite(celebrity.id);
                const price = getCelebrityPrice(celebrity.id);
                const isProcessing = processingPayment === celebrity.id;

                return (
                  <Card key={celebrity.id} className="mobile-card overflow-hidden group hover:shadow-lg transition-all">
                    <CardContent className="p-0">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {celebrity.image_url ? (
                          <img
                            src={celebrity.image_url}
                            alt={celebrity.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Heart className="w-16 h-16 text-muted-foreground/30" />
                          </div>
                        )}
                        {celebrity.is_verified && (
                          <Badge className="absolute top-2 right-2 bg-primary">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {isFav && (
                          <Badge className="absolute top-2 left-2 bg-green-500">
                            <Heart className="w-3 h-3 mr-1 fill-white" />
                            Subscribed
                          </Badge>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg line-clamp-1">{celebrity.name}</h3>
                          <p className="text-sm text-muted-foreground">{celebrity.category}</p>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{celebrity.rating?.toFixed(1) || '0.0'}</span>
                          <span className="text-muted-foreground">({celebrity.review_count || 0})</span>
                        </div>

                        {/* Benefits */}
                        {hasPricing(celebrity.id) && (
                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Video className="w-3.5 h-3.5 text-primary" />
                              <span>UGC Videos & Promotions</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-primary" />
                              <span>AI Image Promotions</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-primary" />
                              <span>Occasion Wishes</span>
                            </div>
                          </div>
                        )}

                        {/* Price and Action */}
                        <div className="pt-2 border-t">
                          {isFav ? (
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => navigate(`/celebrity/${celebrity.id}`)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                              View Profile
                            </Button>
                          ) : price ? (
                            <Button
                              className="w-full"
                              onClick={() => handleAddToFavorites(celebrity)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <span className="animate-pulse">Processing...</span>
                              ) : (
                                <>
                                  <IndianRupee className="w-4 h-4 mr-1" />
                                  {price.toLocaleString()} - Subscribe
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => navigate(`/celebrity/${celebrity.id}`)}
                            >
                              View Profile
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredCelebrities.length === 0 && (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No celebrities found</h3>
                <p className="text-muted-foreground">Try adjusting your search</p>
              </div>
            )}
          </TabsContent>

          {/* My Favorites Tab */}
          <TabsContent value="my-favorites" className="space-y-6">
            {userFavorites.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
                <p className="text-muted-foreground mb-4">Subscribe to celebrities to access their services</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {userFavorites.map((fav) => (
                  <Card key={fav.id} className="mobile-card overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {fav.celebrities?.image_url ? (
                          <img
                            src={fav.celebrities.image_url}
                            alt={fav.celebrities.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Heart className="w-16 h-16 text-muted-foreground/30" />
                          </div>
                        )}
                        <Badge className="absolute top-2 left-2 bg-green-500">
                          <Heart className="w-3 h-3 mr-1 fill-white" />
                          Subscribed
                        </Badge>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{fav.celebrities?.name}</h3>
                          <p className="text-sm text-muted-foreground">{fav.celebrities?.category}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span>Lifetime Access</span>
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => navigate(`/celebrity/${fav.celebrity_id}`)}
                        >
                          Use Services
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Method Selector */}
      {selectedCelebrity && selectedPricing && (
        <PaymentMethodSelector
          open={showPaymentSelector}
          onClose={() => {
            setShowPaymentSelector(false);
            setProcessingPayment(null);
          }}
          amount={selectedPricing.price}
          walletBalance={walletBalance}
          onWalletPayment={handleWalletPayment}
          onRazorpayPayment={handleRazorpayPayment}
          title={`Subscribe to ${selectedCelebrity.name}`}
          description="Choose your payment method for lifetime access"
        />
      )}
    </AuthenticatedLayout>
  );
}
