import { useState } from "react";
import { generateWishMePaymentId } from "@/utils/paymentId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Shield, Clock, Wallet, BadgePercent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RecipientScheduling } from "@/components/booking/RecipientScheduling";

interface CheckoutStepProps {
  bookingData: any;
  updateBookingData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
  celebrity: any;
  serviceType: string;
  currentStep: number;
  totalSteps: number;
}

export function CheckoutStep({
  bookingData,
  updateBookingData,
  onPrev,
  celebrity,
  serviceType,
}: CheckoutStepProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { balance: walletBalance } = useWalletBalance();
  const { discountPercentage, planName, getDiscountedPrice } = usePlanDiscount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [paymentMethodSelectorOpen, setPaymentMethodSelectorOpen] = useState(false);
  const [giftSchedulingEnabled, setGiftSchedulingEnabled] = useState(false);
  const [recipientData, setRecipientData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const getServicePrice = () => {
    switch (serviceType) {
      case 'wish':
        return celebrity.service_prices?.general_wish || 0;
      case 'ad':
        return celebrity.service_prices?.image_promotion || 0;
      case 'video':
        return celebrity.service_prices?.video_promotion || 0;
      default:
        return 0;
    }
  };

  const basePrice = getServicePrice();
  const discountedServicePrice = getDiscountedPrice(basePrice);
  const serviceFee = Math.round(discountedServicePrice * 0.1);
  const totalAmount = discountedServicePrice + serviceFee;
  const savingsAmount = basePrice - discountedServicePrice;

  const handlePaymentClick = () => {
    if (!agreedToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the terms and conditions",
        variant: "destructive"
      });
      return;
    }
    setPaymentMethodSelectorOpen(true);
  };

  const handleWalletPayment = async () => {
    if (walletBalance < totalAmount) {
      toast({
        title: "Insufficient Balance",
        description: "Please add funds to your wallet or use Razorpay",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate('/wallet')}>
            Add Funds
          </Button>
        )
      });
      return;
    }

    setIsProcessing(true);
    try {
      const serviceTypeMap = {
        'wish': 'video_wish' as const,
        'ad': 'image_promotion' as const,
        'video': 'video_promotion' as const
      };

      // CRITICAL: ALL bookings MUST be created with status='pending'
      // Admin approval is REQUIRED before any order processing begins
      // The status will only change to 'confirmed' when admin clicks "Approve Order"
      // This triggers the production webhook: https://sdata0605.app.n8n.cloud/webhook/start1
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          celebrity_id: celebrity.id,
          user_id: profile?.id,
          service_type: serviceTypeMap[serviceType as keyof typeof serviceTypeMap],
          original_price: basePrice,
          discount_amount: savingsAmount,
          final_price: totalAmount,
          status: 'pending', // NEVER auto-confirm - admin approval required
          message: JSON.stringify({
            ...bookingData,
            ...(giftSchedulingEnabled && {
              recipientName: recipientData.name,
              recipientEmail: recipientData.email,
              recipientPhone: recipientData.phone,
            })
          }),
          recipient_name: giftSchedulingEnabled ? recipientData.name : null,
          instructions: bookingData.creativeGuidelines?.goal || '',
          delivery_type: bookingData.deliveryType || 'video',
          generated_prompt: bookingData.scriptBuilder?.generatedScript || ''
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create wallet transaction
      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: profile?.id,
          transaction_type: 'booking',
          amount: totalAmount,
          status: 'completed',
          payment_method: 'wallet',
          transaction_details: {
            booking_id: booking.id,
            celebrity_id: celebrity.id,
            service_type: serviceType,
            base_price: basePrice,
            discount_percentage: discountPercentage,
            discount_amount: savingsAmount,
            plan: planName
          }
        });

      if (txnError) throw txnError;

      // Generate WishMe Payment ID
      let wishmePaymentId = '';
      try {
        wishmePaymentId = generateWishMePaymentId();
        await supabase.from('payment_transactions').insert({
          wishme_payment_id: wishmePaymentId,
          user_id: profile?.id,
          amount: totalAmount,
          payment_method: 'wallet',
          service_type: 'booking',
          booking_id: booking.id,
          description: `Booking for ${celebrity.name} - ${serviceType}`,
          status: 'completed',
          paid_at: new Date().toISOString(),
        });
        await supabase.from('bookings').update({ wishme_payment_id: wishmePaymentId }).eq('id', booking.id);
      } catch (e) { console.warn('Payment ID generation failed:', e); }

      toast({
        title: "Payment Successful!",
        description: "Your order is pending admin approval"
      });

      navigate(`/booking-summary?bookingId=${booking.id}${wishmePaymentId ? `&paymentId=${wishmePaymentId}` : ''}`);
    } catch (error: any) {
      console.error('Wallet payment failed:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Payment failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      const serviceTypeMap = {
        'wish': 'video_wish' as const,
        'ad': 'image_promotion' as const,
        'video': 'video_promotion' as const
      };

      // CRITICAL: ALL bookings MUST be created with status='pending'
      // Admin approval is REQUIRED before any order processing begins
      // The status will only change to 'confirmed' when admin clicks "Approve Order"
      // This triggers the production webhook: https://sdata0605.app.n8n.cloud/webhook/start1
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          celebrity_id: celebrity.id,
          user_id: profile?.id,
          service_type: serviceTypeMap[serviceType as keyof typeof serviceTypeMap],
          original_price: basePrice,
          discount_amount: savingsAmount,
          final_price: totalAmount,
          status: 'pending', // NEVER auto-confirm - admin approval required
          message: JSON.stringify({
            ...bookingData,
            ...(giftSchedulingEnabled && {
              recipientName: recipientData.name,
              recipientEmail: recipientData.email,
              recipientPhone: recipientData.phone,
            })
          }),
          recipient_name: giftSchedulingEnabled ? recipientData.name : null,
          instructions: bookingData.creativeGuidelines?.goal || '',
          delivery_type: bookingData.deliveryType || 'video',
          generated_prompt: bookingData.scriptBuilder?.generatedScript || ''
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: totalAmount,
          currency: 'INR',
          receipt: `booking_${booking.id}`,
          notes: {
            booking_id: booking.id,
            celebrity_id: celebrity.id,
            service_type: serviceType
          }
        }
      });

      if (orderError) throw orderError;

      // Initialize Razorpay
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Celebrity Booking',
        description: `${celebrity.name} - ${serviceType}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: booking.id
              }
            });

            if (verifyError) throw verifyError;

            const wishmePaymentId = verifyData?.wishme_payment_id || '';

            toast({
              title: "Payment Successful!",
              description: "Your order is pending admin approval"
            });

            navigate(`/booking-summary?bookingId=${booking.id}${wishmePaymentId ? `&paymentId=${wishmePaymentId}` : ''}`);
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast({
              title: "Payment Error",
              description: "Payment verification failed. Please contact support.",
              variant: "destructive"
            });
          }
        },
        prefill: {
          name: profile?.first_name || '',
          email: profile?.email || '',
          contact: profile?.phone || ''
        },
        theme: { color: '#7C3AED' },
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

    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Checkout
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Discount Notice */}
        {discountPercentage > 0 && (
          <Alert className="bg-accent/50 border-primary/20">
            <BadgePercent className="h-4 w-4 text-primary" />
            <AlertDescription>
              🎉 <strong>{discountPercentage}% {planName?.toUpperCase()} Plan Discount Applied!</strong> You save ₹{savingsAmount.toLocaleString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Order Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Service</span>
              {discountPercentage > 0 ? (
                <div className="text-right">
                  <span className="line-through text-muted-foreground text-sm mr-2">₹{basePrice.toLocaleString()}</span>
                  <span className="text-primary font-medium">₹{discountedServicePrice.toLocaleString()}</span>
                </div>
              ) : (
                <span>₹{basePrice.toLocaleString()}</span>
              )}
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Platform Fee</span>
              <span>₹{serviceFee.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium text-lg">
              <span>Total</span>
              <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Gift Scheduling Section */}
        <RecipientScheduling
          enabled={giftSchedulingEnabled}
          onEnabledChange={setGiftSchedulingEnabled}
          recipientData={recipientData}
          onDataChange={setRecipientData}
        />

        {/* Delivery Info */}
        <div className="flex items-start gap-3 p-4 bg-accent/50 rounded-lg">
          <Clock className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Expected Delivery</p>
            <p className="text-sm text-muted-foreground">{celebrity.delivery_time}</p>
          </div>
        </div>

        {/* Wallet Balance Display */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="font-medium">Wallet Balance</span>
            </div>
            <span className="text-lg font-semibold">₹{walletBalance.toLocaleString()}</span>
          </div>
          {walletBalance < totalAmount && (
            <p className="text-sm text-muted-foreground mt-2">
              Need ₹{(totalAmount - walletBalance).toLocaleString()} more to pay with wallet
            </p>
          )}
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I agree to the terms and conditions
            </Label>
            <p className="text-xs text-muted-foreground">
              By checking this box, you agree to our{' '}
              <a href="/terms" className="underline">Terms of Service</a> and{' '}
              <a href="/privacy" className="underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
        
        {/* Terms validation message */}
        {!agreedToTerms && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Shield className="w-4 h-4" />
            Please agree to terms and conditions to proceed
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev}>
            Back
          </Button>
          <Button 
            onClick={handlePaymentClick} 
            disabled={!agreedToTerms || isProcessing}
            className={`min-w-[120px] ${!agreedToTerms ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          >
            {isProcessing ? 'Processing...' : `Pay ₹${totalAmount.toLocaleString()}`}
          </Button>
        </div>
      </CardContent>

      {/* Payment Method Selector Modal */}
      <PaymentMethodSelector
        open={paymentMethodSelectorOpen}
        onClose={() => setPaymentMethodSelectorOpen(false)}
        amount={totalAmount}
        walletBalance={walletBalance}
        onWalletPayment={handleWalletPayment}
        onRazorpayPayment={handleRazorpayPayment}
        title="Choose Payment Method"
        description="Select how you'd like to complete your booking payment"
      />
    </Card>
  );
}