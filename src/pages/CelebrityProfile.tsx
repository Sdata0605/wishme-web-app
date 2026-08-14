import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCelebritySubscription } from "@/hooks/useCelebritySubscription";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Star, 
  Video, 
  Heart,
  Share2,
  MapPin,
  Calendar,
  ImageIcon,
  Lock,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PricingGate } from "@/components/celebrity/PricingGate";
import { SubscriptionGate } from "@/components/celebrity/SubscriptionGate";
import { BookAServiceSection } from "@/components/celebrity/BookAServiceSection";

export default function CelebrityProfile() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [celebrity, setCelebrity] = useState(null);
  const [events, setEvents] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionPrice, setSubscriptionPrice] = useState(999);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { isSubscribed, loading: subLoading, checkSubscription } = useCelebritySubscription(id);

  useEffect(() => {
    if (id) {
      fetchCelebrityData();
      if (user) {
        fetchSubscriptionPrice();
      }
    }
  }, [id, user]);

  const fetchSubscriptionPrice = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('celebrity_favorite_pricing')
        .select('price')
        .eq('celebrity_id', id)
        .eq('is_enabled', true)
        .maybeSingle();

      if (error) throw error;
      setSubscriptionPrice(data?.price || 999);
    } catch (error) {
      console.error('Error fetching subscription price:', error);
      setSubscriptionPrice(999);
    }
  };

  const fetchCelebrityData = async () => {
    try {
      const { data: celebrityData, error: celebrityError } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', id)
        .single();

      if (celebrityError) throw celebrityError;
      setCelebrity(celebrityData);

      const { data: eventsData } = await supabase
        .from('celebrity_events')
        .select('*')
        .eq('celebrity_id', id)
        .eq('is_public', true)
        .order('event_date', { ascending: true });

      setEvents(eventsData || []);

      const { data: mediaData } = await supabase
        .from('celebrity_media')
        .select('*')
        .eq('celebrity_id', id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      setMedia(mediaData || []);

    } catch (error) {
      console.error('Error fetching celebrity data:', error);
      toast({
        title: "Error",
        description: "Could not load celebrity profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (serviceType: string) => {
    if (!user) {
      sessionStorage.setItem('redirectAfterAuth', `/celebrity/${id}`);
      navigate('/auth');
      return;
    }

    if (!isSubscribed) {
      setShowSubscriptionModal(true);
      return;
    }
    
    // For UGC ads, navigate to the dedicated UGC page with celebrity context
    if (serviceType === 'ugc') {
      navigate(`/ugc-ads?celebrity=${id}`);
      return;
    }
    
    navigate(`/booking/${id}?service=${serviceType}`);
  };

  const handleSubscriptionSuccess = () => {
    checkSubscription();
    toast({
      title: "Successfully Subscribed!",
      description: `You now have access to all ${celebrity?.name}'s services`,
    });
  };

  if (loading) {
    return null;
  }

  if (!celebrity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Celebrity Not Found</h1>
          <p className="text-muted-foreground">The celebrity profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout showSidebar={!!user}>
      <div className="min-h-screen bg-background">
        {/* Mobile-Native Header with Cover */}
        <div className="lg:hidden">
          {/* Cover Image/Background */}
          <div className="h-48 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 relative overflow-hidden">
            {celebrity.image_url && (
              <img 
                src={celebrity.image_url} 
                alt={celebrity.name}
                className="w-full h-full object-cover opacity-40 blur-sm"
              />
            )}
            {/* Back & Share Actions */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between">
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="bg-background/20 backdrop-blur-md hover:bg-background/30 text-foreground"
              >
                <Share2 className="w-5 h-5" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost"
                className="bg-background/20 backdrop-blur-md hover:bg-background/30 text-foreground"
              >
                <Heart className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Profile Info Card - Overlapping */}
          <div className="px-4 -mt-20 relative z-10">
            <Card className="mobile-card shadow-premium border-border/50">
              <CardContent className="p-5">
                <div className="flex gap-4 items-start mb-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted ring-4 ring-background shadow-lg flex-shrink-0">
                    {celebrity.image_url ? (
                      <img 
                        src={celebrity.image_url} 
                        alt={celebrity.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Star className="w-8 h-8 text-primary" />
                      </div>
                    )}
                  </div>
                  
                  {/* Name & Category */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-bold truncate">{celebrity.name}</h1>
                      {celebrity.is_verified && (
                        <Badge variant="secondary" className="flex-shrink-0">✓</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{celebrity.category}</p>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{celebrity.rating || 0}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({celebrity.review_count || 0})</span>
                      <span className="text-xs text-muted-foreground">• {celebrity.followers || 'Not specified'} followers</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground truncate">{celebrity.location || 'India'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{celebrity.delivery_time}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MOBILE: Subscribe CTA - PROMINENT AT TOP */}
          {user && !subLoading && (
            <div className="px-4 mt-4">
              {isSubscribed ? (
                <Card className="border-2 border-green-500/50 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-700 dark:text-green-300">Subscribed ✓</h3>
                        <p className="text-xs text-muted-foreground">You can now book services</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-2 border-primary shadow-glow bg-gradient-to-br from-primary/5 to-secondary/5">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">Subscribe Now</h3>
                        <p className="text-xs text-muted-foreground">Get lifetime access</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">₹{subscriptionPrice.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">One-time</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>Personalized video wishes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>UGC video promotions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>Image promotions</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => setShowSubscriptionModal(true)} 
                      className="w-full h-12 text-base font-semibold shadow-lg"
                      variant="gradient"
                    >
                      Subscribe to {celebrity.name}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!user && (
            <div className="px-4 mt-4">
              <Card className="border-2 border-primary">
                <CardContent className="p-5 text-center">
                  <h3 className="font-bold text-lg mb-2">Subscribe to {celebrity.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">Sign in to unlock all services</p>
                  <Button 
                    onClick={() => {
                      sessionStorage.setItem('redirectAfterAuth', `/celebrity/${id}`);
                      navigate('/auth');
                    }}
                    className="w-full h-12"
                    variant="gradient"
                  >
                    Sign In to Subscribe
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* MOBILE: Book Services - Below Subscribe */}
          <div className="px-4 mt-6">
            <h3 className="font-bold text-lg mb-3">Book a Service</h3>
            {!user && (
              <div className="mb-4 p-4 bg-muted/50 rounded-xl text-center">
                <Lock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Sign in and subscribe to book services</p>
              </div>
            )}
            {user && !isSubscribed && (
              <div className="mb-4 p-4 bg-muted/50 rounded-xl text-center">
                <Lock className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Subscribe to unlock all services</p>
              </div>
            )}
            <div className="space-y-3">
              {/* Wish a Friend */}
              <Card className={`mobile-card relative ${!user || !isSubscribed ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 relative">
                  {(!user || !isSubscribed) && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                      <div className="text-center">
                        <Lock className="w-6 h-6 mx-auto mb-1 text-primary" />
                        <p className="text-xs font-medium">{!user ? 'Sign in required' : 'Subscribe to unlock'}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Wish a Friend</h4>
                        <p className="text-xs text-muted-foreground">Personal video message</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{celebrity.service_prices?.general_wish || 5000}</p>
                      <Badge variant="secondary" className="text-xs">{celebrity.delivery_time}</Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleBookNow('wish')}
                    className="w-full"
                    disabled={!user || !isSubscribed}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>

              {/* Make an Ad */}
              <Card className={`mobile-card relative ${!user || !isSubscribed ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 relative">
                  {(!user || !isSubscribed) && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                      <div className="text-center">
                        <Lock className="w-6 h-6 mx-auto mb-1 text-primary" />
                        <p className="text-xs font-medium">{!user ? 'Sign in required' : 'Subscribe to unlock'}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                        <Video className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Make an Ad</h4>
                        <p className="text-xs text-muted-foreground">UGC video promotion</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{celebrity.service_prices?.ugc_ad || 25000}</p>
                      <Badge variant="secondary" className="text-xs">{celebrity.delivery_time}</Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleBookNow('ugc')}
                    className="w-full"
                    disabled={!user || !isSubscribed}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>

              {/* Video Promo */}
              <Card className={`mobile-card relative ${!user || !isSubscribed ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 relative">
                  {(!user || !isSubscribed) && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                      <div className="text-center">
                        <Lock className="w-6 h-6 mx-auto mb-1 text-primary" />
                        <p className="text-xs font-medium">{!user ? 'Sign in required' : 'Subscribe to unlock'}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Video Promo</h4>
                        <p className="text-xs text-muted-foreground">Image promotion</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{celebrity.service_prices?.image_promotion || 15000}</p>
                      <Badge variant="secondary" className="text-xs">{celebrity.delivery_time}</Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleBookNow('image')}
                    className="w-full"
                    disabled={!user || !isSubscribed}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Desktop & Content Area */}
        <div className="pt-6 pb-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main Content */}
              <div className="lg:w-3/4">
                {/* Desktop Header - Hidden on Mobile */}
                <div className="mb-6 hidden lg:block">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-muted">
                      {celebrity.image_url ? (
                        <img 
                          src={celebrity.image_url} 
                          alt={`${celebrity.name} - ${celebrity.category}`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Star className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h1 className="text-3xl font-bold">{celebrity.name}</h1>
                        {celebrity.is_verified && (
                          <Badge variant="secondary">Verified</Badge>
                        )}
                      </div>
                      <p className="text-lg text-muted-foreground">{celebrity.category}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-lg">{celebrity.rating || 0}</span>
                        <span className="text-muted-foreground">({celebrity.review_count || 0} reviews)</span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button 
                        size="sm"
                        onClick={() => !user ? navigate('/auth') : isSubscribed ? null : setShowSubscriptionModal(true)}
                        variant={isSubscribed ? "secondary" : "default"}
                      >
                        {isSubscribed ? "Following ✓" : "Follow"}
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Desktop Book a Service Section */}
                <div className="hidden lg:block">
                  <BookAServiceSection 
                    celebrity={celebrity}
                    isSubscribed={isSubscribed}
                    onSubscribe={() => setShowSubscriptionModal(true)}
                  />
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                  <TabsList className="w-full grid grid-cols-5 mb-6">
                    <TabsTrigger value="overview" className="text-xs lg:text-sm">Overview</TabsTrigger>
                    <TabsTrigger value="media" className="text-xs lg:text-sm">Media</TabsTrigger>
                    <TabsTrigger value="events" className="text-xs lg:text-sm">Events</TabsTrigger>
                    <TabsTrigger value="releases" className="text-xs lg:text-sm">Releases</TabsTrigger>
                    <TabsTrigger value="about" className="text-xs lg:text-sm">About</TabsTrigger>
                  </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>About {celebrity.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{celebrity.bio || 'No bio available'}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-medium">{celebrity.location || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Followers</p>
                          <p className="font-medium">{celebrity.followers || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Delivery Time</p>
                          <p className="font-medium">{celebrity.delivery_time}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <p className="font-medium">{celebrity.verification_status}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="media" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Media Gallery</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {media.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {media.map((item) => (
                            <div key={item.id} className="aspect-square bg-muted rounded-lg overflow-hidden">
                              {item.media_type === 'video' ? (
                                <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                                  <Video className="w-8 h-8 text-muted-foreground" />
                                </div>
                              ) : (
                                <img src={item.file_url} alt={item.title} className="w-full h-full object-cover" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center">No media available</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="events" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {events.length > 0 ? (
                        <div className="space-y-4">
                          {events.map((event) => (
                            <div key={event.id} className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
                              <Calendar className="w-6 h-6 text-primary" />
                              <div className="flex-1">
                                <h5 className="font-medium">{event.title}</h5>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(event.event_date).toLocaleDateString()} • {event.location}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center">No upcoming events</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="releases"><Card><CardContent className="p-6"><p className="text-muted-foreground">No releases available</p></CardContent></Card></TabsContent>
                <TabsContent value="about">
                  <Card>
                    <CardHeader><CardTitle>About {celebrity.name}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{celebrity.bio || 'No bio available'}</p>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <MapPin className="w-5 h-5 text-muted-foreground" />
                          <span>{celebrity.location || 'Location not specified'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar - Subscription & Services - Desktop Only */}
            <div className="lg:w-1/4 hidden lg:block">
              <div className="sticky top-4 space-y-4">
                {/* Subscription Status/CTA */}
                {user && !subLoading && (
                  isSubscribed ? (
                    <Card className="border-2 border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
                      <CardContent className="p-6 text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                        <h3 className="font-semibold text-lg text-green-700 dark:text-green-300 mb-1">Subscribed ✓</h3>
                        <p className="text-sm text-muted-foreground">You can now book services</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle className="text-lg">Subscribe to {celebrity.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                          <p className="text-3xl font-bold text-primary">₹{subscriptionPrice.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground mt-1">Lifetime Access</p>
                        </div>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Personalized video wishes</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>UGC video promotions</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Image promotions</span>
                          </li>
                        </ul>
                        <Button onClick={() => setShowSubscriptionModal(true)} className="w-full">
                          Subscribe Now
                        </Button>
                      </CardContent>
                    </Card>
                  )
                )}

                {!user && (
                  <Card className="border-2 border-primary">
                    <CardContent className="p-6 text-center">
                      <h3 className="font-bold text-lg mb-2">Subscribe to {celebrity.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">Sign in to unlock all services</p>
                      <Button 
                        onClick={() => {
                          sessionStorage.setItem('redirectAfterAuth', `/celebrity/${id}`);
                          navigate('/auth');
                        }}
                        className="w-full"
                      >
                        Sign In to Subscribe
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Service Cards - Desktop */}
                {user && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-4">Book a Service</h3>
                      
                      {!isSubscribed && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg text-center">
                          <Lock className="w-5 h-5 mx-auto mb-1 text-primary" />
                          <p className="text-xs text-muted-foreground">Subscribe to unlock services</p>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        {/* Wish a Friend */}
                        <div className={`relative border rounded-lg p-4 transition-all ${isSubscribed ? 'hover:border-primary cursor-pointer' : 'opacity-60'}`}>
                          {!isSubscribed && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-10">
                              <div className="text-center">
                                <Lock className="w-6 h-6 mx-auto mb-1 text-primary" />
                                <p className="text-xs font-medium">Subscribe to unlock</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-3 mb-2">
                            <Heart className="w-5 h-5 text-primary" />
                            <div className="flex-1">
                              <h4 className="font-medium">Wish a Friend</h4>
                              <p className="text-sm text-muted-foreground">Personalized video message</p>
                            </div>
                          </div>
                          <PricingGate isAuthenticated={!!user}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xl font-bold">₹{celebrity.service_prices?.general_wish || 5000}</span>
                              <Badge variant="secondary">{celebrity.delivery_time}</Badge>
                            </div>
                          </PricingGate>
                          <Button 
                            onClick={() => handleBookNow('wish')}
                            className="w-full"
                            disabled={!isSubscribed}
                          >
                            Book Now
                          </Button>
                        </div>

                        {/* Make an Ad */}
                        <div className={`relative border rounded-lg p-4 transition-all ${isSubscribed ? 'hover:border-primary cursor-pointer' : 'opacity-60'}`}>
                          {!isSubscribed && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-10">
                              <div className="text-center">
                                <Lock className="w-6 h-6 mx-auto mb-1 text-primary" />
                                <p className="text-xs font-medium">Subscribe to unlock</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-3 mb-2">
                            <Video className="w-5 h-5 text-primary" />
                            <div className="flex-1">
                              <h4 className="font-medium">Make an Ad</h4>
                              <p className="text-sm text-muted-foreground">UGC video promotion</p>
                            </div>
                          </div>
                          <PricingGate isAuthenticated={!!user}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xl font-bold">₹{celebrity.service_prices?.ugc_ad || 25000}</span>
                              <Badge variant="secondary">{celebrity.delivery_time}</Badge>
                            </div>
                          </PricingGate>
                          <Button 
                            onClick={() => handleBookNow('ugc')}
                            className="w-full"
                            disabled={!isSubscribed}
                          >
                            Book Now
                          </Button>
                        </div>

                        {/* Video Promo */}
                        <div className={`relative border rounded-lg p-4 transition-all ${isSubscribed ? 'hover:border-primary cursor-pointer' : 'opacity-60'}`}>
                          {!isSubscribed && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-10">
                              <div className="text-center">
                                <Lock className="w-6 h-6 mx-auto mb-1 text-primary" />
                                <p className="text-xs font-medium">Subscribe to unlock</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-3 mb-2">
                            <ImageIcon className="w-5 h-5 text-primary" />
                            <div className="flex-1">
                              <h4 className="font-medium">Video Promo</h4>
                              <p className="text-sm text-muted-foreground">Image promotion</p>
                            </div>
                          </div>
                          <PricingGate isAuthenticated={!!user}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xl font-bold">₹{celebrity.service_prices?.image_promotion || 15000}</span>
                              <Badge variant="secondary">{celebrity.delivery_time}</Badge>
                            </div>
                          </PricingGate>
                          <Button 
                            onClick={() => handleBookNow('image')}
                            className="w-full"
                            disabled={!isSubscribed}
                          >
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {celebrity && (
        <SubscriptionGate
          open={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          celebrity={{
            id: celebrity.id,
            name: celebrity.name,
            image_url: celebrity.image_url,
            category: celebrity.category
          }}
          subscriptionPrice={subscriptionPrice}
          onSubscribed={handleSubscriptionSuccess}
        />
      )}
    </AuthenticatedLayout>
  );
}
