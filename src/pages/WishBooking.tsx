import { useEffect, useState } from "react";
import { generateWishMePaymentId } from "@/utils/paymentId";
import { useNavigate, useParams } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";
import { toast } from "sonner";
import { Loader2, Sparkles, Mic, MicOff, RefreshCw, BadgePercent } from "lucide-react";
import { PaymentInstructionModal } from "@/components/payment/PaymentInstructionModal";
import { VoiceMessageInput } from "@/components/voice-assistant/VoiceMessageInput";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ServiceGuide } from "@/components/ui/service-guide";
import { wishBookingGuide } from "@/data/service-guides";

const occasions = [
  "Birthday", "Anniversary", "Wedding", "Congratulations",
  "Get Well Soon", "Thank You", "Good Luck", "Graduation"
];

export default function WishBooking() {
  const { celebrityId } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { balance: walletBalance, loading: balanceLoading, refetch: refetchBalance } = useWalletBalance();
  const { discountPercentage, planName, getDiscountedPrice, getSavingsAmount } = usePlanDiscount();
  const [celebrity, setCelebrity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form data
  const [occasionType, setOccasionType] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  // AI Suggestions
  const [messageSuggestions, setMessageSuggestions] = useState<string[]>([]);
  const [loadingMessageSuggestions, setLoadingMessageSuggestions] = useState(false);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [loadingPromptSuggestions, setLoadingPromptSuggestions] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (celebrityId) {
      fetchCelebrity();
    }
  }, [user, celebrityId, authLoading]);

  const fetchCelebrity = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', celebrityId)
        .single();

      if (error) throw error;
      setCelebrity(data);
    } catch (error) {
      console.error('Error fetching celebrity:', error);
      toast.error('Failed to load celebrity details');
      navigate('/wish-celebrity');
    } finally {
      setLoading(false);
    }
  };


  const fetchMessageSuggestions = async () => {
    if (!occasionType) {
      toast.error('Please select an occasion first');
      return;
    }

    setLoadingMessageSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-message-suggestions', {
        body: {
          celebrityName: celebrity?.name || '',
          occasionType,
          recipientName: recipientName || 'Friend'
        }
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes('Too many requests') || data.error.includes('429')) {
          toast.error('Too many requests. Please try again in a moment.');
        } else if (data.error.includes('credits') || data.error.includes('402')) {
          toast.error('AI credits exhausted. Please try again later.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      setMessageSuggestions(data?.suggestions || []);
      toast.success('Message suggestions generated!');
    } catch (error) {
      console.error('Error fetching message suggestions:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setLoadingMessageSuggestions(false);
    }
  };

  const fetchPromptSuggestions = async () => {
    if (!occasionType) {
      toast.error('Please select an occasion first');
      return;
    }

    setLoadingPromptSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-greeting-card-prompts', {
        body: {
          celebrityName: celebrity?.name || '',
          occasionType,
          recipientName,
          message
        }
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes('Too many requests') || data.error.includes('429')) {
          toast.error('Too many requests. Please try again in a moment.');
        } else if (data.error.includes('credits') || data.error.includes('402')) {
          toast.error('AI credits exhausted. Please try again later.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      setPromptSuggestions(data?.prompts || []);
      toast.success('Prompt suggestions generated!');
    } catch (error) {
      console.error('Error fetching prompt suggestions:', error);
      toast.error('Failed to generate prompts');
    } finally {
      setLoadingPromptSuggestions(false);
    }
  };

  const handlePayment = () => {
    if (!profile?.id) {
      toast.error('Please sign in again to continue');
      navigate('/auth');
      return;
    }
    
    if (!occasionType || !recipientName || !message || !aiPrompt) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (!celebrity?.service_prices?.general_wish) {
      toast.error('Service price not available');
      return;
    }
    
    setShowPaymentModal(true);
  };

  // Calculate discounted price
  const basePrice = celebrity?.service_prices?.general_wish || 5000;
  const finalPrice = getDiscountedPrice(basePrice);
  const savings = getSavingsAmount(basePrice);

  const processWithWallet = async () => {
    if (!profile?.id) {
      toast.error('Profile not found. Please refresh and try again.');
      return;
    }

    if (walletBalance < finalPrice) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setProcessing(true);
    setShowPaymentModal(false);
    
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('wish_celebrity_orders')
        .insert({
          user_id: profile.id,
          celebrity_id: celebrityId,
          occasion_type: occasionType,
          recipient_name: recipientName,
          message: message,
          card_prompt: aiPrompt,
          amount_paid: finalPrice,
          discount_percentage: discountPercentage,
          discount_amount: savings,
          payment_method: 'wallet',
          // Created unpaid; it becomes 'completed' only after the wallet has been charged, and that change is what pays the celebrity.
          payment_status: 'pending',
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Deduct from wallet using 'booking' transaction type with error handling
      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: profile.id,
          amount: finalPrice,
          transaction_type: 'booking',
          status: 'completed',
          description: `Wish order #${order.id} for ${celebrity?.name} - ${occasionType}`,
          transaction_details: {
            base_price: basePrice,
            discount_percentage: discountPercentage,
            discount_amount: savings,
            plan: planName
          }
        });

      if (txnError) {
        // Rollback: Delete the order since payment failed
        await supabase.from('wish_celebrity_orders').delete().eq('id', order.id);
        throw new Error(`Payment failed: ${txnError.message}`);
      }

      // The wallet has been charged: mark the order paid.
      const { error: paidError } = await supabase.from('wish_celebrity_orders').update({ payment_status: 'completed' }).eq('id', order.id);
      if (paidError) console.warn('Could not mark the wish order paid:', paidError.message);

      // Refetch balance to show updated amount
      await refetchBalance();

      // Generate WishMe Payment ID
      try {
        const wmId = generateWishMePaymentId();
        await supabase.from('payment_transactions').insert({
          wishme_payment_id: wmId,
          user_id: profile.id,
          amount: finalPrice,
          payment_method: 'wallet',
          service_type: 'wish_order',
          wish_order_id: order.id,
          description: `Wish order for ${celebrity?.name} - ${occasionType}`,
          status: 'completed',
          paid_at: new Date().toISOString(),
        });
        await supabase.from('wish_celebrity_orders').update({ wishme_payment_id: wmId }).eq('id', order.id);
      } catch (e) { console.warn('Payment ID generation failed:', e); }

      toast.success('Payment successful! Generating greeting card...');
      navigate(`/wish-confirmation/${order.id}`);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const processWithRazorpay = async () => {
    if (!profile?.id) {
      toast.error('Profile not found. Please refresh and try again.');
      return;
    }
    
    setProcessing(true);
    setShowPaymentModal(false);
    
    try {
      // Create order first
      const { data: order, error: orderError } = await supabase
        .from('wish_celebrity_orders')
        .insert({
          user_id: profile.id,
          celebrity_id: celebrityId,
          occasion_type: occasionType,
          recipient_name: recipientName,
          message: message,
          card_prompt: aiPrompt,
          amount_paid: finalPrice,
          discount_percentage: discountPercentage,
          discount_amount: savings,
          payment_method: 'razorpay',
          payment_status: 'pending',
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create Razorpay order
      const { data: razorpayOrder, error: razorpayError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { 
          amount: finalPrice,
          currency: 'INR',
          receipt: `WISH-${order.id}`,
          notes: {
            orderId: order.id,
            orderType: 'wish'
          }
        }
      });

      if (razorpayError || !razorpayOrder?.id) {
        console.error('Razorpay order creation failed:', razorpayError);
        throw new Error('Failed to create payment order');
      }

      // Initialize Razorpay with returned key_id
      const razorpayKey = razorpayOrder.key_id || 'rzp_test_qxSlNwidcjhzZo';
      const options = {
        key: razorpayKey,
        amount: finalPrice * 100,
        currency: 'INR',
        name: 'Wish Me',
        description: `Wish from ${celebrity?.name}`,
        order_id: razorpayOrder.id,
        handler: async function(response: any) {
          try {
            const { data: verifyData } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderId: order.id,
                orderType: 'wish'
              }
            });

            toast.success('Payment successful!');
            navigate(`/wish-confirmation/${order.id}`);
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        theme: { color: '#8B5CF6' },
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
      
      try {
        razorpay.open();
      } catch (error) {
        console.error('Error opening Razorpay:', error);
        toast.error('Failed to open payment gateway');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
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
        <ServiceGuide {...wishBookingGuide} className="mb-6" />
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Wish {celebrity?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                {discountPercentage > 0 ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="line-through text-muted-foreground text-sm">₹{basePrice}</span>
                    <span className="text-primary font-bold">₹{finalPrice}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">Save {discountPercentage}%</Badge>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-primary mt-1">₹{basePrice}</p>
                )}
              </div>
            </div>

            {/* Discount Notice */}
            {discountPercentage > 0 && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <BadgePercent className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  🎉 <strong>{discountPercentage}% {planName?.toUpperCase()} Plan Discount Applied!</strong> You save ₹{savings}
                </AlertDescription>
              </Alert>
            )}

            {/* Occasion Selection */}
            <div className="space-y-2">
              <Label htmlFor="occasion">Occasion *</Label>
              <Select value={occasionType} onValueChange={setOccasionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent>
                  {occasions.map((occasion) => (
                    <SelectItem key={occasion} value={occasion}>
                      {occasion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Your Name (Fan sending the wish) */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Your Name (as the sender) *</Label>
              <Input
                id="recipient"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Your Message *</Label>
              <div className="flex gap-2">
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your heartfelt message..."
                  rows={4}
                  className="flex-1"
                />
                <VoiceMessageInput
                  onTranscript={(text) => setMessage((prev) => prev + (prev ? ' ' : '') + text)}
                  language="en-US"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchMessageSuggestions}
                  disabled={!occasionType || loadingMessageSuggestions}
                >
                  {loadingMessageSuggestions ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1" /> Get AI Suggestions</>
                  )}
                </Button>
                {messageSuggestions.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchMessageSuggestions}
                    disabled={loadingMessageSuggestions}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                  </Button>
                )}
              </div>
              {messageSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Click to use a suggestion (you can edit it):</p>
                  <div className="flex flex-col gap-2">
                    {messageSuggestions.map((suggestion, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 p-3 text-xs leading-relaxed text-left justify-start h-auto whitespace-normal"
                        onClick={() => setMessage(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Prompt for Greeting Card */}
            <div className="space-y-2">
              <Label htmlFor="prompt">AI Prompt for Greeting Card *</Label>
              <div className="flex gap-2">
                <Textarea
                  id="prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe the greeting card you want (e.g., 'A colorful birthday card with balloons and confetti')"
                  rows={3}
                  className="flex-1"
                />
                <VoiceMessageInput
                  onTranscript={(text) => setAiPrompt((prev) => prev + (prev ? ' ' : '') + text)}
                  language="en-US"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchPromptSuggestions}
                  disabled={!occasionType || loadingPromptSuggestions}
                >
                  {loadingPromptSuggestions ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1" /> Suggest Prompts</>
                  )}
                </Button>
                {promptSuggestions.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchPromptSuggestions}
                    disabled={loadingPromptSuggestions}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                  </Button>
                )}
              </div>
              {promptSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Click to use a prompt (you can edit it):</p>
                  <div className="flex flex-col gap-2">
                    {promptSuggestions.map((prompt, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 p-3 text-xs leading-relaxed text-left justify-start h-auto whitespace-normal"
                        onClick={() => setAiPrompt(prompt)}
                      >
                        {prompt}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                💡 Tip: You can edit AI suggestions before paying
              </p>
            </div>

            {/* Wallet Balance */}
            {balanceLoading ? (
              <div className="p-4 bg-primary/5 rounded-lg">
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <div className="p-4 bg-primary/5 rounded-lg space-y-2">
                <p className="text-sm">Your Wallet Balance: <span className="font-semibold">₹{walletBalance}</span></p>
                {walletBalance < finalPrice && (
                  <p className="text-xs text-muted-foreground">
                    Need ₹{(finalPrice - walletBalance).toLocaleString()} more to pay with wallet
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/wish-celebrity')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={processing || balanceLoading || !occasionType || !recipientName || !message || !aiPrompt}
                className="flex-1"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <PaymentInstructionModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onProceedWithWallet={processWithWallet}
          onProceedWithRazorpay={processWithRazorpay}
          celebrityName={celebrity?.name || ''}
          occasionType={occasionType}
          deliveryMethod="ai"
          price={finalPrice}
          walletBalance={walletBalance}
        />
      </div>
    </AuthenticatedLayout>
  );
}
