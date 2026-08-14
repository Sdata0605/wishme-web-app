import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle, Loader2, Sparkles, Send } from "lucide-react";

export default function WishConfirmation() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [celebrity, setCelebrity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (orderId) {
      fetchOrderDetails();
    }
  }, [user, orderId, authLoading]);

  const fetchOrderDetails = async () => {
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

      // Auto-generate card if not generated yet
      if (!orderData.generated_card_image_url && orderData.payment_status === 'completed') {
        handleGenerateCard();
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
      navigate('/wish-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCard = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-wish-celebrity-card', {
        body: { orderId }
      });

      if (error) throw error;

      toast.success('Greeting card generated successfully!');
      await fetchOrderDetails();
    } catch (error) {
      console.error('Error generating card:', error);
      toast.error('Failed to generate greeting card');
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveAndSend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-wish-to-celebrity', {
        body: { orderId }
      });

      if (error) throw error;

      toast.success('Wish sent to celebrity!');
      navigate(`/wish-congratulations?orderId=${orderId}`);
    } catch (error) {
      console.error('Error sending wish:', error);
      toast.error('Failed to send wish');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-12 pt-24 max-w-4xl mobile-safe-bottom">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Order Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Success Message */}
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-200 font-medium">
                Payment successful! Your order has been confirmed.
              </p>
            </div>

            {/* Celebrity Info */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              {celebrity?.image_url && (
                <img 
                  src={celebrity.image_url} 
                  alt={celebrity.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg">{celebrity?.name}</h3>
                <p className="text-sm text-muted-foreground">{celebrity?.category}</p>
              </div>
            </div>

            {/* Order Details */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Occasion</p>
                <p className="font-medium">{order?.occasion_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recipient</p>
                <p className="font-medium">{order?.recipient_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Message</p>
                <p className="font-medium">{order?.message}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Card Design Prompt</p>
                <p className="font-medium text-sm">{order?.card_prompt}</p>
              </div>
            </div>

            {/* Greeting Card Generation */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Greeting Card
              </h3>

              {generating && (
                <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Generating your greeting card...</p>
                </div>
              )}

              {!generating && !order?.generated_card_image_url && (
                <Button onClick={handleGenerateCard} className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Greeting Card
                </Button>
              )}

              {order?.generated_card_image_url && (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border">
                    <img 
                      src={order.generated_card_image_url} 
                      alt="Generated Greeting Card"
                      className="w-full h-auto"
                    />
                  </div>

                  {!order?.is_approved && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Review your greeting card and approve to send it to {celebrity?.name}
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleGenerateCard}
                          disabled={generating}
                          className="flex-1"
                        >
                          Regenerate Card
                        </Button>
                        <Button
                          onClick={handleApproveAndSend}
                          disabled={sending}
                          className="flex-1"
                        >
                          {sending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Approve & Send
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {order?.is_approved && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-green-800 dark:text-green-200 font-medium">
                        Your wish has been sent to {celebrity?.name}!
                      </p>
                      <Button 
                        onClick={() => navigate(`/wish-congratulations?orderId=${orderId}`)}
                        className="w-full mt-3"
                      >
                        Continue
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
