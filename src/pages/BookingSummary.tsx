import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Video, Image as ImageIcon, CheckCircle, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default function BookingSummary() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const paymentId = searchParams.get('paymentId');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [booking, setBooking] = useState<any>(null);
  const [celebrity, setCelebrity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !bookingId) {
      navigate('/auth');
      return;
    }
    fetchBookingDetails();
  }, [bookingId, user, authLoading]);

  const fetchBookingDetails = async () => {
    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      const { data: celebrityData, error: celebrityError } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', bookingData.celebrity_id)
        .single();

      if (celebrityError) throw celebrityError;

      setBooking(bookingData);
      setCelebrity(celebrityData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const downloadCard = async () => {
    if (!booking?.card_url) return;
    
    try {
      toast({
        title: "Downloading...",
        description: "Please wait"
      });

      const response = await fetch(booking.card_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `greeting-card-${bookingId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "Your greeting card has been saved to your device"
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Please check your connection and try again",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading booking details...</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!booking) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <p>Booking not found</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  const deliveryType = booking.delivery_type || 'video';
  const showVideo = deliveryType === 'video' || deliveryType === 'both';
  const showCard = deliveryType === 'card' || deliveryType === 'both';

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-12 pt-24">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground">
              Your order has been successfully placed and is being processed
            </p>
          </div>

          {/* WishMe Payment ID */}
          {(paymentId || booking?.wishme_payment_id) && (
            <div 
              className="rounded-xl p-4 mb-6 text-center border"
              style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }}
            >
              <p className="text-xs text-muted-foreground mb-1">Payment ID</p>
              <p className="font-mono text-2xl font-bold tracking-wider" style={{ color: '#10B981' }}>
                {paymentId || booking?.wishme_payment_id}
              </p>
              <Button 
                variant="ghost" size="sm" className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(paymentId || booking?.wishme_payment_id || '');
                  toast({ title: "Copied!", description: "Payment ID copied to clipboard" });
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> Copy ID
              </Button>
            </div>
          )}

          {/* Booking Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <img 
                  src={celebrity?.image_url || '/placeholder.svg'}
                  alt={celebrity?.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold">{celebrity?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {booking.service_type?.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-medium">#{booking.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="font-medium">₹{booking.final_price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{booking.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">{celebrity?.delivery_time || '24-48 hours'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Preview (if applicable) */}
          {showVideo && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Video Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-8 text-center">
                  <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">
                    Your personalized video message is being created
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You'll be notified when it's ready to view and download
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Greeting Card (if applicable) */}
          {showCard && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Greeting Card
                </CardTitle>
              </CardHeader>
              <CardContent>
                {booking.card_url ? (
                  <div className="space-y-4">
                    <img 
                      src={booking.card_url}
                      alt="Greeting Card"
                      className="w-full rounded-lg"
                    />
                    <Button onClick={downloadCard} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Download Card
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted rounded-lg p-8 text-center">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">
                      Your greeting card is being generated
                    </p>
                    <p className="text-sm text-muted-foreground">
                      It will be available shortly
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/bookings')} className="flex-1">
              View All Bookings
            </Button>
            <Button onClick={() => navigate('/celebrities')} className="flex-1">
              Book Another Celebrity
            </Button>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}