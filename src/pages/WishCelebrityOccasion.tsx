import { useState, useEffect } from "react";
import { generateWishMePaymentId } from "@/utils/paymentId";
import { useParams, useNavigate } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, Sparkles, Upload, Video, Image as ImageIcon, Loader2, Download, Mic, MicOff, Send, RefreshCw, CheckCircle2, AlertCircle, Edit, User, MessageSquare, BadgePercent } from "lucide-react";
import { VoiceMessageInput } from "@/components/voice-assistant/VoiceMessageInput";
import { PaymentInstructionModal } from "@/components/payment/PaymentInstructionModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";
import { ServiceGuide } from "@/components/ui/service-guide";
import { wishCelebrityOccasionGuide } from "@/data/service-guides";

export default function WishCelebrityOccasion() {
  const { celebrityId } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { discountPercentage, planName, getDiscountedPrice, getSavingsAmount } = usePlanDiscount();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [celebrity, setCelebrity] = useState<any>(null);
  const [occasionType, setOccasionType] = useState("Birthday");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [generatedCardUrl, setGeneratedCardUrl] = useState("");
  const [uploadMode, setUploadMode] = useState<'ai' | 'upload-card' | 'upload-video'>('ai');
  const [userUploadedFile, setUserUploadedFile] = useState<File | null>(null);
  const [userUploadPreview, setUserUploadPreview] = useState("");
  const [wishPrice, setWishPrice] = useState(999);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [contentPolicyAccepted, setContentPolicyAccepted] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<{ text: string; url: string; attempts: number } | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [isSendingCard, setIsSendingCard] = useState(false);
  const [cardApproved, setCardApproved] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (celebrityId) {
      fetchCelebrity();
      fetchWalletBalance();
      fetchExistingOrder();
    }
  }, [user, celebrityId, authLoading]);

  // Auto-populate recipient name from profile
  useEffect(() => {
    if (profile && !recipientName) {
      // Use profile name if available, otherwise email username
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
      const emailName = profile.email?.split('@')[0] || '';
      setRecipientName(fullName || emailName);
    }
  }, [profile]);

  const fetchCelebrity = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', celebrityId)
        .single();

      if (error) throw error;
      setCelebrity(data);
      
      // Set price from celebrity's service_prices or default to 999
      const servicePrices = data?.service_prices as any;
      const price = servicePrices?.general_wish || 999;
      setWishPrice(price);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load celebrity profile",
        variant: "destructive"
      });
      navigate('/wish-celebrity');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', profile.id)
        .single();

      if (!error && data) {
        setWalletBalance(data.wallet_balance || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const fetchExistingOrder = async () => {
    if (!profile?.id || !celebrityId) return;

    try {
      // First try localStorage
      let order: any | null = null;
      try {
        const storedId = localStorage.getItem(`wishOrderId:${celebrityId}`);
        if (storedId) {
          const { data: storedOrder } = await supabase
            .from('wish_celebrity_orders')
            .select('*')
            .eq('id', storedId)
            .maybeSingle();
          if (storedOrder) order = storedOrder; else localStorage.removeItem(`wishOrderId:${celebrityId}`);
        }
      } catch {}

      // If not found, fetch latest completed order for this user+celebrity
      if (!order) {
        const { data: existingOrders, error } = await supabase
          .from('wish_celebrity_orders')
          .select('*')
          .eq('user_id', profile.id)
          .eq('celebrity_id', celebrityId)
          .in('payment_status', ['completed'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching existing order:', error);
          return;
        }
        if (existingOrders && existingOrders.length > 0) order = existingOrders[0];
      }

      if (order) {
        console.log('Restoring order:', order);
        try { localStorage.setItem(`wishOrderId:${celebrityId}`, order.id); } catch {}
        setCurrentOrderId(order.id);
        setOccasionType(order.occasion_type);
        setRecipientName(order.recipient_name || '');
        setMessage(order.message);
        setCustomPrompt(order.card_prompt || '');
        setUploadMode(order.card_generation_type as any || 'ai');
        if (order.payment_status === 'completed') {
          setPaymentSuccess(true);
          if (order.generated_card_image_url && order.greeting_text) {
            setGeneratedCard({ text: order.greeting_text, url: order.generated_card_image_url, attempts: order.generation_attempts || 0 });
          }
          if (order.card_approved || order.status === 'sent') setCardApproved(true);
        }
      }
    } catch (error) {
      console.error('Error in fetchExistingOrder:', error);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setMessage(prev => prev + (prev ? ' ' : '') + text);
  };

  const generateMessageSuggestions = async () => {
    if (!celebrity || !occasionType) return;
    
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-message-suggestions', {
        body: {
          celebrityName: celebrity.name,
          occasionType,
          recipientName: recipientName || 'them'
        }
      });

      if (error) throw error;
      
      setAiSuggestions(data.suggestions || []);
      toast({
        title: "Suggestions Ready",
        description: "Click a suggestion to use it"
      });
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Error",
        description: "Could not generate suggestions",
        variant: "destructive"
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const generatePromptSuggestions = () => {
    const suggestions = [
      `Make it colorful and festive with celebratory elements. Include ${recipientName}'s name prominently and ${celebrity?.name}'s photo in an elegant frame.`,
      `Design a warm, heartfelt card with soft colors and gentle decorations. Feature ${celebrity?.name}'s smiling photo alongside ${recipientName}'s name in beautiful typography.`,
      `Create a vibrant, joyful design with confetti and sparkles. Showcase ${celebrity?.name}'s photo as the centerpiece with ${recipientName}'s name in bold, celebratory text.`
    ];
    return suggestions;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUserFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUserUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePayment = () => {
    if (!message || !recipientName) {
      toast({
        title: "Missing Information",
        description: "Please provide recipient name and your message",
        variant: "destructive"
      });
      return;
    }

    if (uploadMode !== 'ai' && !userUploadedFile) {
      toast({
        title: "Missing File",
        description: "Please upload your card or video",
        variant: "destructive"
      });
      return;
    }

    setShowPaymentModal(true);
  };

  const createWishOrder = async () => {
    // Upload user's own card/video if provided
    let userCardUrl = "";
    let userVideoUrl = "";

    if (uploadMode === 'upload-card' && userUploadedFile && profile?.id) {
      const fileExt = userUploadedFile.name.split('.').pop();
      const fileName = `user-cards/${profile.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('greeting-card-uploads')
        .upload(fileName, userUploadedFile);

      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('greeting-card-uploads')
        .getPublicUrl(fileName);
      
      userCardUrl = publicUrl;
    } else if (uploadMode === 'upload-video' && userUploadedFile && profile?.id) {
      const fileExt = userUploadedFile.name.split('.').pop();
      const fileName = `user-videos/${profile.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('greeting-card-uploads')
        .upload(fileName, userUploadedFile);

      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('greeting-card-uploads')
        .getPublicUrl(fileName);
      
      userVideoUrl = publicUrl;
    }

    // Upload reference image if provided for AI mode
    let uploadedImageUrl = "";
    if (uploadMode === 'ai' && referenceImage && profile?.id) {
      const fileExt = referenceImage.name.split('.').pop();
      const fileName = `ref-images/${profile.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('greeting-card-uploads')
        .upload(fileName, referenceImage);

      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('greeting-card-uploads')
        .getPublicUrl(fileName);
      
      uploadedImageUrl = publicUrl;
    }

    // Create wish record
    const { data: wishData, error: wishError } = await supabase
      .from('wish_celebrity_orders')
      .insert({
        user_id: profile?.id,
        celebrity_id: celebrityId,
        occasion_type: occasionType,
        recipient_name: recipientName,
        message: message,
        card_prompt: uploadMode === 'ai' && customPrompt ? customPrompt : (uploadMode === 'ai' ? `Generate a beautiful ${occasionType} greeting for ${recipientName}. Message: ${message}` : null),
        reference_image_url: uploadedImageUrl || null,
        user_uploaded_card_url: userCardUrl || null,
        user_uploaded_video_url: userVideoUrl || null,
        card_generation_type: uploadMode,
        status: 'pending',
        payment_status: 'pending',
        amount_paid: wishPrice
      })
      .select()
      .single();

    if (wishError) throw wishError;
    
    return wishData;
  };

  // Calculate discounted price
  const baseWishPrice = wishPrice;
  const discountedWishPrice = getDiscountedPrice(baseWishPrice);
  const wishSavings = getSavingsAmount(baseWishPrice);

  const processWithWallet = async () => {
    if (walletBalance < discountedWishPrice) {
      toast({
        title: "Insufficient Balance",
        description: "Your wallet balance is too low",
        variant: "destructive"
      });
      return;
    }

    setShowPaymentModal(false);
    setGenerating(true);

    try {
      toast({
        title: "Processing...",
        description: "Creating your wish order"
      });

      const wishData = await createWishOrder();
      setCurrentOrderId(wishData.id);
      try { localStorage.setItem(`wishOrderId:${celebrityId}`, wishData.id); } catch {}


      // Record wallet transaction (trigger will update balance)
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: profile?.id,
          transaction_type: 'greeting_card_generation',
          amount: discountedWishPrice,
          status: 'completed',
          payment_method: 'wallet',
          transaction_details: {
            wish_order_id: wishData.id,
            celebrity_id: celebrityId,
            celebrity_name: celebrity?.name,
            occasion_type: occasionType,
            recipient_name: recipientName,
            base_price: baseWishPrice,
            discount_percentage: discountPercentage,
            discount_amount: wishSavings,
            plan: planName
          }
        });

      if (transactionError) throw transactionError;

      // Update wish order payment status
      await supabase
        .from('wish_celebrity_orders')
        .update({
          payment_status: 'completed',
          payment_method: 'wallet'
        })
        .eq('id', wishData.id);

      // Generate WishMe Payment ID
      try {
        const wmId = generateWishMePaymentId();
        await supabase.from('payment_transactions').insert({
          wishme_payment_id: wmId,
          user_id: profile?.id,
          amount: discountedWishPrice,
          payment_method: 'wallet',
          service_type: 'wish_order',
          wish_order_id: wishData.id,
          description: `Wish for ${celebrity?.name} - ${occasionType}`,
          status: 'completed',
          paid_at: new Date().toISOString(),
        });
        await supabase.from('wish_celebrity_orders').update({ wishme_payment_id: wmId }).eq('id', wishData.id);
      } catch (e) { console.warn('Payment ID generation failed:', e); }

      setPaymentSuccess(true);
      fetchWalletBalance();

      toast({
        title: "Payment Successful!",
        description: "Paid from wallet"
      });

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Payment failed",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const processWithRazorpay = async () => {
    setShowPaymentModal(false);
    setGenerating(true);

    try {
      toast({
        title: "Processing...",
        description: "Creating your wish order"
      });

      const wishData = await createWishOrder();
      setCurrentOrderId(wishData.id);
      try { localStorage.setItem(`wishOrderId:${celebrityId}`, wishData.id); } catch {}


      // Create Razorpay order
      toast({
        title: "Opening Payment Gateway",
        description: "Please complete the payment"
      });

      const { data: razorpayData, error: razorpayError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: wishPrice,
          receipt: `wish_${wishData.id}`,
          notes: {
            wish_order_id: wishData.id,
            celebrity_id: celebrityId,
            user_id: profile?.id
          }
        }
      });

      if (razorpayError) throw razorpayError;

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: razorpayData.key_id,
          amount: razorpayData.amount,
          currency: razorpayData.currency,
          order_id: razorpayData.id,
          name: 'Celebrity Wish',
          description: `Wish ${celebrity.name} on ${occasionType}`,
          handler: async function (response: any) {
            try {
              // Verify payment
              const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: wishData.id,
                  orderType: 'wish'
                }
              });

              if (verifyError) throw verifyError;

              await supabase
                .from('wish_celebrity_orders')
                .update({
                  payment_status: 'completed',
                  payment_method: 'razorpay',
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id
                })
                .eq('id', wishData.id);

              setPaymentSuccess(true);
              
              toast({
                title: "Payment Successful!",
                description: "Processing your wish..."
              });

            } catch (err: any) {
              toast({
                title: "Error",
                description: err.message || "Payment verification failed",
                variant: "destructive"
              });
            }
          },
          prefill: {
            email: profile?.email,
            contact: profile?.phone || ''
          },
          theme: { color: 'hsl(var(--primary))' },
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
          },
          modal: {
            ondismiss: function() {
              supabase
                .from('wish_celebrity_orders')
                .update({ payment_status: 'failed' })
                .eq('id', wishData.id);
              setGenerating(false);
            }
          }
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      };

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive"
      });
      setGenerating(false);
    }
  };

  // Resolve a valid orderId from state or DB as a fallback
  const resolveOrderId = async (): Promise<string | null> => {
    if (currentOrderId) {
      const { data } = await supabase
        .from('wish_celebrity_orders')
        .select('id')
        .eq('id', currentOrderId)
        .maybeSingle();
      if (data?.id) return currentOrderId;
    }

    if (!profile?.id || !celebrityId) return null;
    const { data: order } = await supabase
      .from('wish_celebrity_orders')
      .select('id, payment_status, generated_card_image_url, greeting_text')
      .eq('user_id', profile.id)
      .eq('celebrity_id', celebrityId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (order?.id) {
      setCurrentOrderId(order.id);
      return order.id;
    }
    return null;
  };

  const handleGenerateCard = async () => {
    const orderId = await resolveOrderId();
    if (!orderId) {
      toast({
        title: "Error",
        description: "Order not found. Please complete payment first.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingCard(true);

    try {
      toast({
        title: "Generating Card",
        description: "AI is creating your personalized card..."
      });

      const { data, error } = await supabase.functions.invoke('generate-wish-celebrity-card', {
        body: { orderId }
      });

      if (error) {
        // Check for specific AI errors
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          toast({
            title: "Rate limited",
            description: "Please wait a moment and try again.",
            variant: "destructive"
          });
          return;
        }
        if (error.message?.includes('402') || error.message?.includes('Payment required')) {
          toast({
            title: "AI credits exhausted",
            description: "Please top up Lovable AI credits in workspace settings.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      const cardUrl = data?.card_url ?? data?.cardUrl ?? data?.card_image_url ?? data?.image_url;
      const greetingText = data?.greeting_text ?? data?.greetingText;
      if (data?.success || cardUrl) {
        setGeneratedCard({
          text: greetingText,
          url: cardUrl,
          attempts: data?.generation_attempts ?? (generatedCard?.attempts || 0) + 1,
        });
        toast({
          title: "Card Ready!",
          description: "Review and approve to send to the celebrity."
        });
      } else {
        throw new Error(data?.error || 'Failed to generate card');
      }
    } catch (error: any) {
      console.error('Error generating card:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate card",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const handleSendUploadedContent = async () => {
    if (!currentOrderId) return;

    setGenerating(true);

    try {
      await supabase
        .from('wish_celebrity_orders')
        .update({
          status: 'sent',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentOrderId);

      toast({
        title: "Sending Message",
        description: "Sending thank you to celebrity..."
      });

      await supabase.functions.invoke('send-wish-thankyou-dm', {
        body: { orderId: currentOrderId }
      });

      toast({
        title: "Success!",
        description: `Your wish has been sent to ${celebrity.name}!`
      });

      // Clean up localStorage
      localStorage.removeItem(`wishOrderId:${celebrityId}`);

      setTimeout(() => {
        navigate(`/wish-congratulations?orderId=${currentOrderId}`);
      }, 1500);

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send wish",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveAndSend = async () => {
    const orderId = await resolveOrderId();
    if (!orderId || !generatedCard) {
      toast({
        title: "Error",
        description: !orderId ? "Order not found. Please complete payment first." : "No card to send",
        variant: "destructive"
      });
      return;
    }

    setIsSendingCard(true);
    try {
      console.log('Sending card to celebrity for order:', orderId);
      const { data, error } = await supabase.functions.invoke('send-wish-to-celebrity', {
        body: { orderId }
      });

      console.log('Send response:', { data, error });

      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(error.message || 'Failed to invoke send function');
      }

      if (data?.success) {
        setCardApproved(true);
        toast({
          title: "Wish Sent! 🎉",
          description: `Your greeting card has been sent to ${celebrity?.name}`,
        });
        
        // Clean up localStorage
        localStorage.removeItem(`wishOrderId:${celebrityId}`);
        
        setTimeout(() => {
          navigate(`/wish-congratulations?orderId=${currentOrderId}`);
        }, 1500);
      } else {
        throw new Error(data?.error || 'Failed to send card');
      }
    } catch (error: any) {
      console.error('Error sending card - Full error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      toast({
        title: "Send Failed",
        description: error.message || 'Failed to send greeting card. Please check console for details.',
        variant: "destructive"
      });
    } finally {
      setIsSendingCard(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout showSidebar={!!user}>
        <div className="container mx-auto px-4 py-8 pt-20 md:pt-24">
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground animate-pulse">Loading celebrity details...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout showSidebar={!!user}>
      <div className="container mx-auto px-4 py-8 pt-20 md:pt-24 mobile-safe-bottom max-w-4xl">
        <ServiceGuide {...wishCelebrityOccasionGuide} className="mb-6" />
        {/* Celebrity Display Card */}
        <Card className="mb-6 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary">
                <AvatarImage src={celebrity?.image_url} alt={celebrity?.name} />
                <AvatarFallback>{celebrity?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{celebrity?.name}</h2>
                  {celebrity?.is_verified && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{celebrity?.category}</p>
                <p className="text-lg font-semibold text-primary mt-2">
                  Wish Price: ₹{wishPrice}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Success - Show Options */}
        {paymentSuccess && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="ml-2">
              <strong>Payment Successful!</strong> Now choose how to send your wish:
            </AlertDescription>
          </Alert>
        )}

        {!paymentSuccess ? (
          // Pre-Payment Form
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Create Your Wish
              </CardTitle>
              <CardDescription>
                Fill in the details below to create a personalized wish
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Occasion Type */}
              <div>
                <Label htmlFor="occasion_type">Occasion Type *</Label>
                <Select value={occasionType} onValueChange={setOccasionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Birthday">Birthday</SelectItem>
                    <SelectItem value="Anniversary">Anniversary</SelectItem>
                    <SelectItem value="Achievement">Achievement</SelectItem>
                    <SelectItem value="Congratulations">Congratulations</SelectItem>
                    <SelectItem value="Thank You">Thank You</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient Name */}
              <div>
                <Label htmlFor="recipient_name">Recipient Name *</Label>
                <Input
                  id="recipient_name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Who is this wish for?"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-filled from your profile. You can edit it.
                </p>
              </div>

              {/* Message with Voice Input and AI Suggestions */}
              <div>
                <Label htmlFor="message">Your Message *</Label>
                <div className="flex gap-2 mb-2">
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your heartfelt message or use voice input..."
                    rows={4}
                    className="flex-1"
                  />
                  <VoiceMessageInput onTranscript={handleVoiceTranscript} />
                </div>
                
                {/* AI Message Suggestions */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateMessageSuggestions}
                    disabled={loadingSuggestions || !occasionType}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    {loadingSuggestions ? 'Generating...' : 'Get AI Suggestions'}
                  </Button>
                  
                  {aiSuggestions.map((suggestion, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs bg-accent/50 hover:bg-accent"
                      onClick={() => setMessage(suggestion)}
                    >
                      {suggestion.substring(0, 40)}...
                    </Button>
                  ))}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Tip: Use the microphone to speak your message or get AI suggestions
                </p>
              </div>

              {/* Upload Mode Selection */}
              <div>
                <Label>Delivery Method *</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={uploadMode === 'ai' ? 'default' : 'outline'}
                    onClick={() => setUploadMode('ai')}
                    className="h-auto py-3"
                  >
                    <div className="text-center">
                      <Sparkles className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-xs">AI Card</div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={uploadMode === 'upload-card' ? 'default' : 'outline'}
                    onClick={() => setUploadMode('upload-card')}
                    className="h-auto py-3"
                  >
                    <div className="text-center">
                      <ImageIcon className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-xs">Upload Card</div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={uploadMode === 'upload-video' ? 'default' : 'outline'}
                    onClick={() => setUploadMode('upload-video')}
                    className="h-auto py-3"
                  >
                    <div className="text-center">
                      <Upload className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-xs">Upload Video</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* AI Mode - Optional Reference Image */}
              {uploadMode === 'ai' && (
                <div>
                  <Label htmlFor="reference_image">Reference Image (Optional)</Label>
                  <Input
                    id="reference_image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="cursor-pointer"
                  />
                  {referenceImageUrl && (
                    <div className="mt-2">
                      <img src={referenceImageUrl} alt="Reference" className="max-w-xs rounded border" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a reference image to guide the AI's style
                  </p>
                </div>
              )}

              {/* Upload Card Mode */}
              {uploadMode === 'upload-card' && (
                <div>
                  <Label htmlFor="user_card">Upload Your Card *</Label>
                  <Input
                    id="user_card"
                    type="file"
                    accept="image/*"
                    onChange={handleUserFileUpload}
                    className="cursor-pointer"
                  />
                  {userUploadPreview && (
                    <div className="mt-2">
                      <img src={userUploadPreview} alt="Your card" className="max-w-xs rounded border" />
                    </div>
                  )}
                </div>
              )}

              {/* Upload Video Mode */}
              {uploadMode === 'upload-video' && (
                <div>
                  <Label htmlFor="user_video">Upload Your Video *</Label>
                  <Input
                    id="user_video"
                    type="file"
                    accept="video/*"
                    onChange={handleUserFileUpload}
                    className="cursor-pointer"
                  />
                  {userUploadPreview && (
                    <div className="mt-2">
                      <video src={userUploadPreview} controls className="max-w-xs rounded border" />
                    </div>
                  )}
                </div>
              )}

              {/* AI Prompt Customization */}
              {uploadMode === 'ai' && (
                <Collapsible open={showPromptEditor} onOpenChange={setShowPromptEditor}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between" type="button">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Customize AI Card Design (Optional)
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showPromptEditor ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-3">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Choose a suggestion or write your own:</Label>
                      <div className="flex flex-col gap-2 mb-3">
                        {generatePromptSuggestions().map((suggestion, idx) => (
                          <Button
                            key={idx}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto py-2 px-3 text-left justify-start whitespace-normal"
                            onClick={() => setCustomPrompt(suggestion)}
                          >
                            <span className="text-xs">{suggestion}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder={`The AI will automatically include ${recipientName}'s name and ${celebrity?.name}'s photo. You can add extra style instructions here...`}
                      rows={3}
                    />
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>Note:</strong> The greeting card will always include {recipientName}'s name prominently and feature {celebrity?.name}'s photo as part of the design.
                      </AlertDescription>
                    </Alert>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Content Policy Warning */}
              <Alert variant="destructive" className="border-red-500">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2 text-sm">
                  <strong>Content Policy:</strong> No vulgar, harassing, or illegal content is allowed. 
                  Misuse may lead to legal action and account restrictions.
                </AlertDescription>
              </Alert>

              {/* Content Policy Checkbox */}
              <div className="flex items-start space-x-2 p-4 border rounded-lg">
                <Checkbox
                  id="content_policy"
                  checked={contentPolicyAccepted}
                  onCheckedChange={(checked) => setContentPolicyAccepted(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="content_policy"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I agree to the content policy *
                  </label>
                  <p className="text-xs text-muted-foreground">
                    I confirm that my content is respectful and complies with all applicable laws and platform guidelines.
                  </p>
                </div>
              </div>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={generating || !message || !recipientName || !contentPolicyAccepted}
                className="w-full"
                size="lg"
              >
                {generating ? "Processing..." : `Proceed to Payment (₹${wishPrice})`}
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Post-Payment Options
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Send Your Wish
              </CardTitle>
              <CardDescription>
                Choose how you want to deliver your wish to {celebrity?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadMode === 'ai' ? (
                <div className="space-y-4">
                  {/* Wish Details Review Section */}
                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Your Wish Details</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingDetails(true)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isEditingDetails ? (
                        <div className="space-y-4">
                          <div>
                            <Label>Occasion</Label>
                            <Input
                              value={occasionType}
                              onChange={(e) => setOccasionType(e.target.value)}
                              placeholder="e.g., Birthday, Anniversary"
                            />
                          </div>
                          <div>
                            <Label>Recipient Name (Celebrity Name)</Label>
                            <Input
                              value={recipientName}
                              onChange={(e) => setRecipientName(e.target.value)}
                              placeholder="Celebrity's name"
                            />
                          </div>
                          <div>
                            <Label>Your Message</Label>
                            <Textarea
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Your wish message"
                              rows={4}
                            />
                          </div>
                          <div>
                            <Label>Custom Card Design (Optional)</Label>
                            <Textarea
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              placeholder="Describe how you want the card to look"
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setIsEditingDetails(false);
                                setGeneratedCard(null); // Reset card to regenerate with new details
                              }}
                              className="flex-1"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Save Changes
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsEditingDetails(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <Heart className="h-4 w-4 mt-1 text-primary" />
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Occasion</p>
                              <p className="text-base">{occasionType}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 mt-1 text-primary" />
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Recipient (Celebrity)</p>
                              <p className="text-base">{recipientName}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 mt-1 text-primary" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-muted-foreground">Your Message</p>
                              <p className="text-base whitespace-pre-wrap bg-background/50 p-3 rounded-lg mt-1">
                                {message}
                              </p>
                            </div>
                          </div>
                          
                          {customPrompt && (
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 mt-1 text-primary" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-muted-foreground">Custom Card Design</p>
                                <p className="text-base whitespace-pre-wrap bg-background/50 p-3 rounded-lg mt-1">
                                  {customPrompt}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <p className="text-xs text-muted-foreground mt-2">Order ID: {currentOrderId || 'not set'}</p>

                  {!generatedCard && (
                    <Button
                      onClick={handleGenerateCard}
                      disabled={isGeneratingCard}
                      className="w-full"
                      size="lg"
                    >
                      {isGeneratingCard ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Your Greeting Card...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate AI Greeting Card
                        </>
                      )}
                    </Button>
                  )}

                  {generatedCard && !cardApproved && (
                    <Card className="p-6 space-y-4 border-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">Generated Greeting Card</h3>
                          <Badge variant="secondary">
                            Attempt {generatedCard.attempts}/3
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <img 
                          src={generatedCard.url} 
                          alt="Generated greeting card" 
                          className="w-full rounded-lg border shadow-sm"
                        />
                        
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Greeting Message:</h4>
                          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                            {generatedCard.text}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {isEditingPrompt ? (
                          <div className="space-y-2">
                            <Label>Edit Card Design Instructions</Label>
                            <Textarea
                              value={editablePrompt}
                              onChange={(e) => setEditablePrompt(e.target.value)}
                              placeholder="Describe how you want the card to look"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setCustomPrompt(editablePrompt);
                                  setIsEditingPrompt(false);
                                  handleGenerateCard();
                                }}
                                disabled={isGeneratingCard}
                                className="flex-1"
                              >
                                {isGeneratingCard ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Regenerating...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Regenerate with New Prompt
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setIsEditingPrompt(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 pt-2">
                            <Button
                              onClick={handleApproveAndSend}
                              disabled={isSendingCard}
                              className="flex-1"
                              size="lg"
                            >
                              {isSendingCard ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 h-4 w-4" />
                                  Approve & Send to {celebrity?.name}
                                </>
                              )}
                            </Button>
                            
                            {generatedCard.attempts < 3 && (
                              <Button
                                onClick={() => {
                                  setIsEditingPrompt(true);
                                  setEditablePrompt(customPrompt);
                                }}
                                variant="outline"
                                size="lg"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit & Regenerate
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {generatedCard.attempts >= 3 && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            You've used all 3 generation attempts. Please approve this card to send it to {celebrity?.name}.
                          </AlertDescription>
                        </Alert>
                      )}
                    </Card>
                  )}

                  {cardApproved && (
                    <Alert className="border-green-500">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription>
                        Your greeting card has been sent to {celebrity?.name}! Check your messages to see their reply.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleSendUploadedContent}
                  disabled={generating}
                  className="w-full"
                  size="lg"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  {generating ? "Sending..." : "Send Your Wish"}
                </Button>
              )}

              {generatedCardUrl && (
                <div className="mt-4">
                  <Label>Generated Card Preview:</Label>
                  <img src={generatedCardUrl} alt="Generated card" className="mt-2 rounded border w-full" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Instruction Modal */}
        <PaymentInstructionModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onProceedWithRazorpay={processWithRazorpay}
          onProceedWithWallet={processWithWallet}
          celebrityName={celebrity?.name || ''}
          occasionType={occasionType}
          deliveryMethod={uploadMode}
          price={wishPrice}
          walletBalance={walletBalance}
        />
      </div>
    </AuthenticatedLayout>
  );
}
