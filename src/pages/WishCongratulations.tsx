import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageCircle, Sparkles, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function WishCongratulations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [celebrity, setCelebrity] = useState<any>(null);
  const [countdown, setCountdown] = useState(10);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    const orderId = searchParams.get('orderId');
    if (!orderId) {
      navigate('/wish-orders');
      return;
    }

    fetchOrderDetails(orderId);
  }, [user, searchParams, authLoading]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/messages');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('wish_celebrity_orders')
        .select(`
          *,
          celebrities (
            id,
            name,
            image_url,
            category
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      
      setOrder(orderData);
      setCelebrity(orderData.celebrities);

      // Fetch payment ID
      const { data: paymentTx } = await supabase
        .from('payment_transactions')
        .select('wishme_payment_id')
        .eq('wish_order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (paymentTx?.wishme_payment_id) {
        setPaymentId(paymentTx.wishme_payment_id);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      navigate('/wish-orders');
    }
  };

  if (!order || !celebrity) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-12 pt-24 mobile-safe-bottom">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-primary/20 shadow-xl">
            <CardContent className="p-8 text-center">
              {/* Success Icon */}
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                  <CheckCircle className="w-20 h-20 text-green-500 relative animate-bounce" />
                </div>
              </div>

              {/* Success Message */}
              <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center justify-center gap-2">
                <Sparkles className="w-8 h-8 text-primary" />
                Congratulations!
              </h1>
              
              <p className="text-xl text-muted-foreground mb-6">
                Your wish has been sent successfully!
              </p>

              {/* WishMe Payment ID */}
              {paymentId && (
                <div 
                  className="rounded-xl p-4 mb-6 text-center border"
                  style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }}
                >
                  <p className="text-xs text-muted-foreground mb-1">Payment ID</p>
                  <p className="font-mono text-2xl font-bold tracking-wider" style={{ color: '#10B981' }}>
                    {paymentId}
                  </p>
                  <Button 
                    variant="ghost" size="sm" className="mt-2"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentId);
                      toast({ title: "Copied!", description: "Payment ID copied to clipboard" });
                    }}
                  >
                    <Copy className="w-4 h-4 mr-1" /> Copy ID
                  </Button>
                </div>
              )}

              {/* Celebrity Info */}
              <div className="bg-muted/50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  {celebrity.image_url && (
                    <img 
                      src={celebrity.image_url} 
                      alt={celebrity.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">{celebrity.name}</h3>
                    <p className="text-sm text-muted-foreground">{celebrity.category}</p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p><span className="font-medium">Occasion:</span> {order.occasion_type}</p>
                  <p><span className="font-medium">To:</span> {order.recipient_name}</p>
                </div>
              </div>

              {/* Message Preview */}
              <div className="bg-background border rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-muted-foreground mb-2">Your message:</p>
                <p className="text-sm">{order.message}</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/messages')}
                  size="lg"
                  className="w-full"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  View Conversation with {celebrity.name}
                </Button>

                <Button 
                  onClick={() => navigate('/wish-orders')}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  View All My Wishes
                </Button>
              </div>

              {/* Auto-redirect countdown */}
              <p className="text-sm text-muted-foreground mt-6">
                Redirecting to messages in {countdown} seconds...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
