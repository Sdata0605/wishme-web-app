import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Star, Video, Image, Play, Loader2, ArrowLeft, BadgePercent } from "lucide-react";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ServiceGuide } from "@/components/ui/service-guide";
import { bookingDetailGuide } from "@/data/service-guides";

interface Celebrity {
  id: string;
  name: string;
  category: string;
  bio: string;
  location: string;
  rating: number;
  review_count: number;
  followers: string;
  image_url: string;
  is_verified: boolean;
  delivery_time: string;
  service_prices: any;
}

interface ServiceOption {
  type: 'video_wish' | 'image_promotion' | 'video_promotion';
  title: string;
  description: string;
  icon: any;
  price: number;
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { discountPercentage, planName, getDiscountedPrice, getSavingsAmount } = usePlanDiscount();
  
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null);
  const [selectedService, setSelectedService] = useState<'video_wish' | 'image_promotion' | 'video_promotion'>('video_wish');
  const [message, setMessage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate(`/auth?redirect=/celebrity/${id}/book`);
      return;
    }

    fetchCelebrity();
  }, [id, user]);

  const fetchCelebrity = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCelebrity(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load celebrity details",
        variant: "destructive"
      });
      navigate('/celebrities');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedServicePrice = () => {
    if (!celebrity) return 0;
    const serviceOption = serviceOptions.find(s => s.type === selectedService);
    return serviceOption?.price || 0;
  };

  const handleBooking = async () => {
    if (!user || !profile || !celebrity) return;

    setBooking(true);
    try {
      const originalPrice = getSelectedServicePrice();
      const discountAmount = getSavingsAmount(originalPrice);
      const finalPrice = getDiscountedPrice(originalPrice);

      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: profile.id,
          celebrity_id: celebrity.id,
          service_type: selectedService,
          original_price: originalPrice,
          discount_amount: discountAmount,
          final_price: finalPrice,
          message,
          instructions,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Booking Confirmed!",
        description: "Your booking has been submitted successfully. You'll receive updates soon."
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!celebrity) return null;

  const serviceOptions: ServiceOption[] = [
    {
      type: 'video_wish',
      title: 'Personal Video Wish',
      description: 'Get a personalized video message for you or your loved ones',
      icon: Video,
      price: celebrity.service_prices?.general_wish || 0
    },
    {
      type: 'image_promotion',
      title: 'Image Promotion',
      description: 'Professional photo with your product/brand for marketing',
      icon: Image,
      price: celebrity.service_prices?.image_promotion || 0
    },
    {
      type: 'video_promotion',
      title: 'Video Advertisement',
      description: 'Full promotional video featuring your product/service',
      icon: Play,
      price: celebrity.service_prices?.video_promotion || 0
    }
  ];

  const currentBasePrice = getSelectedServicePrice();
  const finalPrice = getDiscountedPrice(currentBasePrice);
  const savings = getSavingsAmount(currentBasePrice);

  return (
    <AuthenticatedLayout showSidebar={!!user}>
      <div className="pt-4 pb-20 mobile-safe-bottom">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <img 
                src={celebrity.image_url}
                alt={`${celebrity.name} - Celebrity Profile`} 
                className="w-10 h-10 rounded-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div>
                <h1 className="font-semibold">{celebrity.name}</h1>
                <p className="text-sm text-muted-foreground">{celebrity.category}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          <ServiceGuide {...bookingDetailGuide} />
          {/* Discount Notice */}
          {discountPercentage > 0 && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <BadgePercent className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                🎉 <strong>{discountPercentage}% {planName?.toUpperCase()} Plan Discount Applied!</strong> on all services
              </AlertDescription>
            </Alert>
          )}

          {/* Service Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Service Type</CardTitle>
              <CardDescription>Select the type of service you'd like to book</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {serviceOptions.map((service) => (
                <div
                  key={service.type}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedService === service.type
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedService(service.type)}
                >
                  <div className="flex items-start gap-3">
                    <service.icon className="w-5 h-5 text-primary mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                      {discountPercentage > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="line-through text-muted-foreground text-sm">₹{service.price.toLocaleString()}</span>
                          <span className="text-lg font-bold text-primary">₹{getDiscountedPrice(service.price).toLocaleString()}</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">Save {discountPercentage}%</Badge>
                        </div>
                      ) : (
                        <p className="text-lg font-bold text-primary">₹{service.price.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pricing Details */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Original Price</span>
                <span>₹{currentBasePrice.toLocaleString()}</span>
              </div>
              {discountPercentage > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>{planName ? planName.charAt(0).toUpperCase() + planName.slice(1) : ''} Plan Discount ({discountPercentage}%)</span>
                    <span>-₹{savings.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                    <span>Final Price</span>
                    <span className="text-primary">₹{finalPrice.toLocaleString()}</span>
                  </div>
                </>
              )}
              {discountPercentage === 0 && (
                <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">₹{finalPrice.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message for Celebrity */}
          <Card>
            <CardHeader>
              <CardTitle>Message for {celebrity.name}</CardTitle>
              <CardDescription>Tell them what this video/promotion is for</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., Happy Birthday message for my mom Sarah, she's your biggest fan!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Special Instructions (Optional)</CardTitle>
              <CardDescription>Any specific requirements or details</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., Please mention her love for dancing, use a happy tone"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>

          {/* Booking Summary */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Booking Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src={celebrity.image_url} 
                  alt={`${celebrity.name} - Celebrity Profile`} 
                  className="w-12 h-12 rounded-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <p className="font-semibold">{celebrity.name}</p>
                  <p className="text-sm text-muted-foreground">{serviceOptions.find(s => s.type === selectedService)?.title}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Delivery Time</span>
                  <span>{celebrity.delivery_time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span>{celebrity.rating} ({celebrity.review_count} reviews)</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount</span>
                  <span className="text-primary">₹{finalPrice.toLocaleString()}</span>
                </div>
                
                <Button 
                  onClick={handleBooking}
                  disabled={!message.trim() || booking}
                  className="w-full h-12 text-lg"
                >
                  {booking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Book Now - ₹${finalPrice.toLocaleString()}`
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  By booking, you agree to our terms and conditions
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}