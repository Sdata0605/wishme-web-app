import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Video, Image, MessageSquare, Sparkles } from "lucide-react";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionGateProps {
  open: boolean;
  onClose: () => void;
  celebrity: {
    id: string;
    name: string;
    image_url?: string;
    category: string;
  };
  subscriptionPrice: number;
  onSubscribed: () => void;
}

export function SubscriptionGate({
  open,
  onClose,
  celebrity,
  subscriptionPrice,
  onSubscribed
}: SubscriptionGateProps) {
  const { profile } = useAuth();
  const { balance, refetch: fetchBalance } = useWalletBalance();
  const { toast } = useToast();
  const [showPayment, setShowPayment] = useState(false);

  const benefits = [
    { icon: Heart, text: "Personalized video wishes for loved ones" },
    { icon: Video, text: "UGC video promotions for your brand" },
    { icon: Image, text: "AI-powered image promotions" },
    { icon: MessageSquare, text: "Occasion greetings and auto-replies" },
    { icon: Sparkles, text: "Lifetime access - pay once, use forever" }
  ];

  const handleWalletPayment = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase.rpc('purchase_celebrity_subscription', {
        p_celebrity_id: celebrity.id,
        p_price: subscriptionPrice,
        p_payment_method: 'wallet'
      });

      if (error) throw error;

      // Fire-and-forget email notification
      const subscriberName = profile.first_name && profile.last_name 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile.email || 'A new fan';
      
      supabase.functions.invoke('send-celebrity-subscription-email', {
        body: {
          celebrity_id: celebrity.id,
          subscriber_name: subscriberName,
          subscriber_email: profile.email,
          price_paid: subscriptionPrice
        }
      }).catch(err => console.error('Email notification failed:', err));

      await fetchBalance();
      toast({
        title: "Successfully Subscribed!",
        description: `You now have access to all ${celebrity.name}'s services`,
      });

      onSubscribed();
      setShowPayment(false);
      onClose();
    } catch (error: any) {
      throw new Error(error.message || 'Subscription failed');
    }
  };

  const handleRazorpayPayment = async () => {
    toast({
      title: "Payment Gateway",
      description: "Razorpay integration coming soon. Please use wallet payment.",
    });
  };

  return (
    <>
      <Dialog open={open && !showPayment} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Subscribe to {celebrity.name}</DialogTitle>
            <DialogDescription>
              Get lifetime access to all services
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              {celebrity.image_url && (
                <img
                  src={celebrity.image_url}
                  alt={celebrity.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg">{celebrity.name}</h3>
                <Badge variant="secondary">{celebrity.category}</Badge>
              </div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Subscription Price</p>
              <p className="text-4xl font-bold text-primary mb-1">₹{subscriptionPrice.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Lifetime Access • Pay Once, Use Forever</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">What you get:</h4>
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <benefit.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{benefit.text}</p>
                </div>
              ))}
            </div>

            <Button onClick={() => setShowPayment(true)} className="w-full" size="lg">
              Subscribe Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentMethodSelector
        open={showPayment}
        onClose={() => setShowPayment(false)}
        amount={subscriptionPrice}
        walletBalance={balance}
        onWalletPayment={handleWalletPayment}
        onRazorpayPayment={handleRazorpayPayment}
        title={`Subscribe to ${celebrity.name}`}
        description="Choose your payment method"
      />
    </>
  );
}
