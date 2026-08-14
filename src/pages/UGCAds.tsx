import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Video, Sparkles, Clock, CheckCircle, AlertCircle, 
  Copy, Download, Upload, Image, Megaphone, Play, 
  RefreshCw, Wallet, Star, Lock
} from "lucide-react";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { PricingDisplay } from "@/components/ui/discount-badge";
import { ServiceGuide } from "@/components/ui/service-guide";
import { ugcAdsGuide } from "@/data/service-guides";

interface UGCAd {
  id: string;
  product_name: string;
  product_description: string;
  product_image_url: string;
  script: string;
  video_url?: string;
  thumbnail_url?: string;
  status: string;
  price_paid: number;
  created_at: string;
  completed_at?: string;
  avatar_id?: string;
  hook_style?: string;
  call_to_action?: string;
  generation_error?: string;
  celebrity_id?: string;
}

interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  preview_image_url?: string;
  gender?: string;
}

interface Celebrity {
  id: string;
  name: string;
  image_url?: string;
  category?: string;
  heygen_avatar_id?: string;
  heygen_voice_id?: string;
  service_prices?: {
    ugc_ad?: number;
    [key: string]: any;
  };
}

const HOOK_STYLES = [
  { value: 'question', label: 'Question Hook', description: 'Start with a thought-provoking question' },
  { value: 'bold_claim', label: 'Bold Claim', description: 'Start with an attention-grabbing statement' },
  { value: 'problem_solution', label: 'Problem/Solution', description: 'Highlight a problem your product solves' },
  { value: 'testimonial', label: 'Testimonial Style', description: 'Share a personal experience' },
  { value: 'curiosity', label: 'Curiosity Hook', description: 'Create intrigue about your product' },
];

const ASPECT_RATIOS = [
  { value: '9:16', label: 'Vertical (9:16)', description: 'Best for TikTok, Reels, Shorts' },
  { value: '16:9', label: 'Horizontal (16:9)', description: 'Best for YouTube, Website' },
  { value: '1:1', label: 'Square (1:1)', description: 'Best for Instagram Feed' },
];

export default function UGCAds() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const celebrityId = searchParams.get('celebrity');
  const { balance: walletBalance, refetch: refetchWallet } = useWalletBalance();
  const { discountPercentage, planName, getDiscountedPrice } = usePlanDiscount();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Celebrity context
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null);
  const [loadingCelebrity, setLoadingCelebrity] = useState(!!celebrityId);

  // Form state
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [hookStyle, setHookStyle] = useState("question");
  const [callToAction, setCta] = useState("Check the link in my bio!");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [selectedAvatar, setSelectedAvatar] = useState("");

  // Data state
  const [ads, setAds] = useState<UGCAd[]>([]);
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [basePrice, setBasePrice] = useState(999);
  const [activeTab, setActiveTab] = useState("create");

  // Price logic - use celebrity-specific price if available
  const effectiveBasePrice = celebrity?.service_prices?.ugc_ad || basePrice;
  const finalPrice = getDiscountedPrice(effectiveBasePrice);

  useEffect(() => {
    if (user) {
      fetchAds();
      if (!celebrityId) {
        fetchAvatars();
      }
      fetchPlatformSettings();
    }
  }, [user, celebrityId]);

  // Fetch celebrity data if celebrityId is provided
  useEffect(() => {
    if (celebrityId && user) {
      fetchCelebrity();
    }
  }, [celebrityId, user]);

  const fetchCelebrity = async () => {
    if (!celebrityId) return;
    
    setLoadingCelebrity(true);
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('id, name, image_url, category, heygen_avatar_id, heygen_voice_id, service_prices')
        .eq('id', celebrityId)
        .single();

      if (error) throw error;
      // Type cast service_prices to the expected format
      setCelebrity({
        ...data,
        service_prices: data.service_prices as { ugc_ad?: number; [key: string]: any } | undefined
      });
      
      // Use celebrity's avatar if configured
      if (data?.heygen_avatar_id) {
        setSelectedAvatar(data.heygen_avatar_id);
      }
    } catch (error) {
      console.error('Error fetching celebrity:', error);
      toast({
        title: "Celebrity Not Found",
        description: "Could not load celebrity data",
        variant: "destructive"
      });
      // Navigate back if celebrity not found
      navigate('/celebrities');
    } finally {
      setLoadingCelebrity(false);
    }
  };

  const fetchPlatformSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'ugc_ads_price')
        .single();

      if (!error && data) {
        setBasePrice(parseInt(data.setting_value) || 999);
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
    }
  };

  const fetchAds = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ugc_ads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    }
  };

  const fetchAvatars = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('heygen-get-avatars');
      if (!error && data?.avatars) {
        setAvatars(data.avatars);
        if (data.avatars.length > 0) {
          setSelectedAvatar(data.avatars[0].avatar_id);
        }
      }
    } catch (error) {
      console.error('Error fetching avatars:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('promotional-content')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('promotional-content')
        .getPublicUrl(fileName);

      setProductImageUrl(urlData.publicUrl);
      toast({
        title: "Image Uploaded",
        description: "Product image uploaded successfully"
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = () => {
    if (!productName.trim()) {
      toast({
        title: "Missing Product Name",
        description: "Please enter your product name",
        variant: "destructive"
      });
      return false;
    }
    if (!productImageUrl) {
      toast({
        title: "Missing Product Image",
        description: "Please upload a product image",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleGenerate = () => {
    if (!validateForm()) return;
    setShowPaymentSelector(true);
  };

  const handleWalletPayment = async () => {
    if (!user || !profile) return;

    setIsGenerating(true);
    setShowPaymentSelector(false);

    try {
      // Check wallet balance
      if ((walletBalance || 0) < finalPrice) {
        toast({
          title: "Insufficient Balance",
          description: `You need ₹${finalPrice} but only have ₹${walletBalance || 0} in your wallet.`,
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      // Create wallet transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: profile.id,
          transaction_type: 'ugc_video',
          amount: finalPrice,
          status: 'completed',
          payment_method: 'wallet',
          description: `UGC Ad: ${productName}`
        });

      if (txError) throw txError;

      await processGeneration();
      refetchWallet();

      toast({
        title: "Payment Successful",
        description: `₹${finalPrice} deducted from your wallet`
      });
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!user || !profile) return;

    setShowPaymentSelector(false);
    setIsGenerating(true);

    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: finalPrice,
          currency: 'INR',
          receipt: `ugcad_${Date.now().toString().slice(-8)}`,
          notes: {
            user_id: user.id,
            type: 'ugc_ad'
          }
        }
      });

      if (orderError) throw orderError;

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'UGC Ad Generation',
        description: `UGC Ad for ${productName}`,
        order_id: orderData.id,
        handler: async function () {
          await processGeneration();
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
        toast({
          title: "Payment Failed",
          description: response.error.description,
          variant: "destructive"
        });
        setIsGenerating(false);
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };

  const processGeneration = async () => {
    if (!user) return;

    try {
      // Create ad record with celebrity_id if available
      const { data: adRecord, error: adError } = await supabase
        .from('ugc_ads')
        .insert({
          user_id: user.id,
          product_name: productName,
          product_description: productDescription,
          product_image_url: productImageUrl,
          prompt: prompt,
          hook_style: hookStyle,
          call_to_action: callToAction,
          avatar_id: celebrity?.heygen_avatar_id || selectedAvatar,
          aspect_ratio: aspectRatio,
          status: 'pending',
          price_paid: finalPrice,
          celebrity_id: celebrity?.id || null
        })
        .select()
        .single();

      if (adError) throw adError;

      // Call edge function to generate - pass celebrity_id for avatar/voice lookup
      const { data, error } = await supabase.functions.invoke('generate-ugc-ad', {
        body: {
          ugc_ad_id: adRecord.id,
          product_name: productName,
          product_description: productDescription,
          product_image_url: productImageUrl,
          prompt: prompt,
          hook_style: hookStyle,
          call_to_action: callToAction,
          avatar_id: celebrity?.heygen_avatar_id || selectedAvatar,
          voice_id: celebrity?.heygen_voice_id || undefined,
          aspect_ratio: aspectRatio,
          celebrity_id: celebrity?.id || null
        }
      });

      if (error) throw error;

      await fetchAds();

      toast({
        title: "UGC Ad Generation Started! 🎬",
        description: data.message || "Your ad is being generated. Check 'My Ads' tab for progress."
      });

      // Reset form
      setProductName("");
      setProductDescription("");
      setProductImageUrl("");
      setPrompt("");
      setIsGenerating(false);

      // Switch to My Ads tab using React state
      setActiveTab("my-ads");

    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };

  const copyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    toast({ title: "Copied!", description: "Script copied to clipboard" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-emerald-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'processing':
      case 'video_generating':
      case 'video_processing':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Processing Video</Badge>;
      case 'script_generating':
        return <Badge variant="secondary"><Sparkles className="w-3 h-3 mr-1" />Generating Script</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300"><Clock className="w-3 h-3 mr-1" />Awaiting Review</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (!user) {
    return (
      <AuthenticatedLayout showSidebar={false}>
        <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 pt-20 md:pt-24 text-center">
          <Card className="max-w-md mx-auto p-8">
            <CardContent className="space-y-4">
              <Megaphone className="w-16 h-16 mx-auto text-muted-foreground" />
              <CardTitle>Authentication Required</CardTitle>
              <p className="text-muted-foreground">Please log in to create UGC Ads</p>
              <Button onClick={() => navigate('/auth')}>Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (loadingCelebrity) {
    return (
      <AuthenticatedLayout showSidebar={!!user}>
        <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 pt-20 md:pt-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            {celebrity ? `UGC Ad with ${celebrity.name}` : 'AI UGC Ad Generator'}
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            {celebrity 
              ? `Create a viral-ready UGC video ad featuring ${celebrity.name}'s AI avatar`
              : 'Create viral-ready UGC video ads for your products in minutes using AI avatars'
            }
          </p>

          <ServiceGuide {...ugcAdsGuide} className="mt-6 text-left" />
          
          {/* Celebrity Card when in celebrity mode */}
          {celebrity && (
            <Card className="max-w-md mx-auto mt-6 border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {celebrity.image_url ? (
                      <img 
                        src={celebrity.image_url} 
                        alt={celebrity.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Star className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-lg">{celebrity.name}</h3>
                    <p className="text-sm text-muted-foreground">{celebrity.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {celebrity.heygen_avatar_id ? (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Avatar Configured
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Default Avatar
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">₹{effectiveBasePrice.toLocaleString()}</p>
                    {discountPercentage > 0 && (
                      <p className="text-xs text-muted-foreground line-through">
                        ₹{effectiveBasePrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {!celebrity && (
            <div className="flex justify-center gap-2 mt-4">
              <Badge variant="secondary" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                <Sparkles className="w-3 h-3 mr-1" />
                Powered by HeyGen
              </Badge>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="create">
              <Sparkles className="w-4 h-4 mr-2" />
              Create Ad
            </TabsTrigger>
            <TabsTrigger value="my-ads">
              <Video className="w-4 h-4 mr-2" />
              My Ads ({ads.length})
            </TabsTrigger>
          </TabsList>

          {/* Create Tab */}
          <TabsContent value="create">
            <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {/* Left Column - Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Details</CardTitle>
                  <CardDescription>
                    Tell us about your product and we'll create a compelling UGC ad
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Product Name */}
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g., SuperGlow Vitamin C Serum"
                    />
                  </div>

                  {/* Product Description */}
                  <div className="space-y-2">
                    <Label htmlFor="productDesc">Product Description</Label>
                    <Textarea
                      id="productDesc"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      placeholder="Describe your product's key features and benefits..."
                      rows={3}
                    />
                  </div>

                  {/* Product Image */}
                  <div className="space-y-2">
                    <Label>Product Image *</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      {productImageUrl ? (
                        <div className="relative">
                          <img
                            src={productImageUrl}
                            alt="Product"
                            className="max-h-48 mx-auto rounded-lg object-cover"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => setProductImageUrl("")}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Upload your product image (this will be used as background)
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {isUploading ? "Uploading..." : "Upload Image"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Additional Instructions (Optional)</Label>
                    <Textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Any specific points to highlight, target audience, or style preferences..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Ad Settings</CardTitle>
                  <CardDescription>
                    Customize your UGC ad style and format
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Hook Style */}
                  <div className="space-y-2">
                    <Label>Hook Style</Label>
                    <Select value={hookStyle} onValueChange={setHookStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOOK_STYLES.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            <div>
                              <div className="font-medium">{style.label}</div>
                              <div className="text-xs text-muted-foreground">{style.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Call to Action */}
                  <div className="space-y-2">
                    <Label htmlFor="cta">Call to Action</Label>
                    <Input
                      id="cta"
                      value={callToAction}
                      onChange={(e) => setCta(e.target.value)}
                      placeholder="e.g., Check the link in my bio!"
                    />
                  </div>

                  {/* Aspect Ratio */}
                  <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map((ratio) => (
                          <SelectItem key={ratio.value} value={ratio.value}>
                            <div>
                              <div className="font-medium">{ratio.label}</div>
                              <div className="text-xs text-muted-foreground">{ratio.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Avatar Selection - Only show if NOT in celebrity mode */}
                  {!celebrity && avatars.length > 0 && (
                    <div className="space-y-2">
                      <Label>AI Avatar</Label>
                      <Select value={selectedAvatar} onValueChange={setSelectedAvatar}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an avatar" />
                        </SelectTrigger>
                        <SelectContent>
                          {avatars.slice(0, 20).map((avatar) => (
                            <SelectItem key={avatar.avatar_id} value={avatar.avatar_id}>
                              <div className="flex items-center gap-2">
                                {avatar.preview_image_url && (
                                  <img 
                                    src={avatar.preview_image_url} 
                                    alt={avatar.avatar_name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                                <span>{avatar.avatar_name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Celebrity Avatar Indicator */}
                  {celebrity && (
                    <div className="space-y-2">
                      <Label>AI Avatar</Label>
                      <Card className="bg-muted/50 border-primary/20">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                              {celebrity.image_url ? (
                                <img 
                                  src={celebrity.image_url} 
                                  alt={celebrity.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Star className="w-5 h-5 text-primary" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{celebrity.name}'s Avatar</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Using celebrity's configured avatar
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Price & Generate */}
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="p-4 space-y-4">
                      <PricingDisplay 
                        basePrice={effectiveBasePrice} 
                        discountedPrice={finalPrice}
                        discountPercentage={discountPercentage}
                        planName={planName}
                        label={celebrity ? `${celebrity.name} UGC Ad` : "UGC Ad Price"}
                        showUpgradeLink={discountPercentage === 0}
                      />

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Wallet className="w-4 h-4" />
                          Wallet Balance
                        </span>
                        <span>₹{walletBalance?.toLocaleString() || 0}</span>
                      </div>

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleGenerate}
                        disabled={isGenerating || !productName || !productImageUrl}
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Placing Order...
                          </>
                        ) : (
                          <>
                            <Megaphone className="w-4 h-4 mr-2" />
                            {celebrity ? `Order ${celebrity.name} Ad` : 'Place UGC Ad Order'}
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Our team will create your professional video within 24-48 hours
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* My Ads Tab */}
          <TabsContent value="my-ads">
            {ads.length === 0 ? (
              <Card className="max-w-md mx-auto p-8 text-center">
                <CardContent className="space-y-4">
                  <Video className="w-16 h-16 mx-auto text-muted-foreground" />
                  <CardTitle>No Ads Yet</CardTitle>
                  <p className="text-muted-foreground">
                    Create your first UGC ad to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {ads.map((ad) => (
                  <Card key={ad.id} className="overflow-hidden">
                    {/* Thumbnail/Video */}
                    <div className="relative aspect-[9/16] bg-muted">
                      {ad.video_url ? (
                        <video
                          src={ad.video_url}
                          poster={ad.product_image_url}
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={ad.product_image_url}
                            alt={ad.product_name}
                            className="w-full h-full object-cover opacity-50"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/30">
                            {ad.status === 'failed' ? (
                              <>
                                <AlertCircle className="w-12 h-12 text-destructive mb-2" />
                                <p className="text-white text-sm text-center">Generation Failed</p>
                              </>
                            ) : ad.status === 'pending_approval' ? (
                              <>
                                <Clock className="w-12 h-12 text-amber-400 mb-2" />
                                <p className="text-white text-sm text-center font-medium">Under Review</p>
                                <p className="text-white/80 text-xs text-center mt-1">Our team is creating your video</p>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-12 h-12 text-primary animate-spin mb-2" />
                                <p className="text-white text-sm text-center">Processing...</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(ad.status)}
                      </div>
                    </div>

                    {/* Info */}
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold truncate">{ad.product_name}</h3>
                      
                      {ad.script && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {ad.script}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyScript(ad.script)}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Script
                          </Button>
                        </div>
                      )}

                      {ad.generation_error && (
                        <p className="text-xs text-destructive">
                          {ad.generation_error}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                        <span>₹{ad.price_paid}</span>
                      </div>

                      {ad.video_url && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(ad.video_url, '_blank')}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download Video
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={fetchAds}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Payment Selector */}
        <PaymentMethodSelector
          open={showPaymentSelector}
          onClose={() => setShowPaymentSelector(false)}
          amount={finalPrice}
          onWalletPayment={handleWalletPayment}
          onRazorpayPayment={handleRazorpayPayment}
          walletBalance={walletBalance || 0}
          title="Pay for UGC Ad"
          description={`Generate a UGC video ad for ${productName || 'your product'}`}
        />
      </div>
    </AuthenticatedLayout>
  );
}
