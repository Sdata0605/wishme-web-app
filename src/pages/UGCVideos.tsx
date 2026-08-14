import { useState, useEffect } from "react";
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
import { useCelebrityFavorites } from "@/hooks/useCelebrityFavorites";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Video, Sparkles, Clock, CheckCircle, AlertCircle, Copy, Download, Heart, Wallet, BadgePercent } from "lucide-react";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { PricingDisplay } from "@/components/ui/discount-badge";
import { ServiceGuide } from "@/components/ui/service-guide";
import { ugcVideosGuide } from "@/data/service-guides";

interface Celebrity {
  id: string;
  name: string;
  category: string;
  image_url?: string;
}

interface UGCGeneration {
  id: string;
  celebrity_id: string;
  concept: string;
  script: string;
  video_url?: string;
  thumbnail_url?: string;
  status: string;
  price_paid: number;
  created_at: string;
  completed_at?: string;
  heygen_video_id?: string;
  generation_metadata?: any;
  celebrities: Celebrity;
}

export default function UGCVideos() {
  const { user, profile } = useAuth();
  const { favorites } = useCelebrityFavorites();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { balance: walletBalance } = useWalletBalance();
  const { discountPercentage, planName, getDiscountedPrice } = usePlanDiscount();

  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [generations, setGenerations] = useState<UGCGeneration[]>([]);
  const [selectedCelebrity, setSelectedCelebrity] = useState<string>("");
  const [concept, setConcept] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [baseUgcPrice, setBaseUgcPrice] = useState(500);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);

  const ugcPrice = getDiscountedPrice(baseUgcPrice);

  useEffect(() => {
    if (user && favorites.length > 0) {
      fetchFavoriteCelebrities();
      fetchGenerations();
    }
  }, [user, favorites]);

  useEffect(() => {
    fetchPlatformSettings();
  }, []);

  useEffect(() => {
    const celebrityParam = searchParams.get('celebrity');
    if (celebrityParam) {
      setSelectedCelebrity(celebrityParam);
    }
  }, [searchParams]);

  const fetchPlatformSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'ugc_video_price')
        .single();

      if (error) throw error;
      if (data) {
        setBaseUgcPrice(parseInt(data.setting_value) || 500);
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
    }
  };

  const fetchFavoriteCelebrities = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('id, name, category, image_url')
        .in('id', favorites)
        .eq('is_active', true);

      if (error) throw error;
      setCelebrities(data || []);
    } catch (error) {
      console.error('Error fetching celebrities:', error);
    }
  };

  const fetchGenerations = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('ugc_video_generations')
        .select(`
          *,
          celebrities (*)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGenerations(data || []);
    } catch (error) {
      console.error('Error fetching generations:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCelebrity || !concept.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a celebrity and enter your concept",
        variant: "destructive"
      });
      return;
    }

    if (!profile?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate UGC videos",
        variant: "destructive"
      });
      return;
    }

    // Open payment selector
    setShowPaymentSelector(true);
  };

  const handleWalletPayment = async () => {
    if (!profile?.id) return;

    setIsGenerating(true);
    setShowPaymentSelector(false);

    try {
      // Check wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', profile.id)
        .single();

      if (walletError) throw walletError;

      const currentBalance = walletData.wallet_balance || 0;

      if (currentBalance < ugcPrice) {
        toast({
          title: "Insufficient Balance",
          description: `You need ₹${ugcPrice} but only have ₹${currentBalance} in your wallet.`,
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      // Create wallet transaction record (trigger will update balance)
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: profile.id,
          transaction_type: 'ugc_video',
          amount: ugcPrice,
          status: 'completed',
          payment_method: 'wallet',
          transaction_details: {
            celebrity_id: selectedCelebrity,
            concept: concept.substring(0, 100)
          }
        });

      if (txError) throw txError;

      // Process generation
      await processGeneration(null);

      toast({
        title: "Payment Successful",
        description: `₹${ugcPrice} deducted from your wallet`
      });

    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Could not process wallet payment",
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!profile?.id) return;

    setShowPaymentSelector(false);
    setIsGenerating(true);

    try {
      // Create Razorpay order with shortened receipt (max 40 chars)
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: ugcPrice,
          currency: 'INR',
          receipt: `ugc_${Date.now().toString().slice(-8)}`,
          notes: {
            user_id: profile.id,
            celebrity_id: selectedCelebrity,
            type: 'ugc_video'
          }
        }
      });

      if (orderError) throw orderError;

      // Initialize Razorpay
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'UGC Video Generation',
        description: 'AI-powered video script generation',
        order_id: orderData.id,
        handler: async function (response: any) {
          await processGeneration(response);
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
        description: error.message || "Could not process payment",
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };

  const processGeneration = async (paymentResponse: any) => {
    try {
      // Create generation record
      const { data: generation, error: genError } = await supabase
        .from('ugc_video_generations')
        .insert({
          user_id: profile!.id,
          celebrity_id: selectedCelebrity,
          concept: concept,
          status: 'processing',
          price_paid: ugcPrice
        })
        .select()
        .single();

      if (genError) throw genError;

      // Call edge function to generate script
      const { data: scriptData, error: scriptError } = await supabase.functions.invoke('generate-ugc-video', {
        body: {
          concept,
          celebrity_id: selectedCelebrity,
          user_id: profile!.id,
          generation_id: generation.id
        }
      });

      if (scriptError) throw scriptError;

      await fetchGenerations();

      toast({
        title: "Success! 🎬",
        description: scriptData.message || "Your UGC video script has been generated!"
      });

      // Reset form
      setConcept("");
      setSelectedCelebrity("");
      setIsGenerating(false);

      // Switch to My Videos tab
      document.querySelector('[value="my-videos"]')?.dispatchEvent(new Event('click'));

    } catch (error: any) {
      toast({
        title: "Generation Error",
        description: error.message || "Could not generate video script",
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };

  const copyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    toast({
      title: "Copied!",
      description: "Script copied to clipboard"
    });
  };

  if (!user) {
    return (
      <AuthenticatedLayout showSidebar={false}>
        <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 pt-20 md:pt-24 mobile-safe-bottom text-center">
          <Card className="mobile-card max-w-md mx-auto p-8">
            <CardContent className="space-y-4">
              <Video className="w-16 h-16 mx-auto text-muted-foreground" />
              <CardTitle>Authentication Required</CardTitle>
              <p className="text-muted-foreground">Please log in to generate UGC videos</p>
              <Button onClick={() => navigate('/auth')}>Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (favorites.length === 0) {
    return (
      <AuthenticatedLayout showSidebar={!!user}>
        <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 pt-20 md:pt-24 mobile-safe-bottom">
          <Card className="mobile-card max-w-2xl mx-auto p-8 text-center">
            <CardContent className="space-y-4">
              <Heart className="w-16 h-16 mx-auto text-muted-foreground" />
              <CardTitle className="text-2xl">Subscribe to Celebrities First</CardTitle>
              <p className="text-muted-foreground">
                You need to subscribe to at least one celebrity to generate UGC videos
              </p>
              <Button onClick={() => navigate('/following')}>
                <Sparkles className="w-4 h-4 mr-2" />
                Browse Celebrities
              </Button>
            </CardContent>
          </Card>
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
            UGC Video Generation
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Create AI-powered video scripts with your favorite celebrities
          </p>
          <Badge variant="outline" className="mt-4">
            Phase 1: Script + Avatar Image
          </Badge>
        </div>

        <ServiceGuide {...ugcVideosGuide} className="mb-6" />

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="create">
              <Sparkles className="w-4 h-4 mr-2" />
              Create
            </TabsTrigger>
            <TabsTrigger value="my-videos">
              <Video className="w-4 h-4 mr-2" />
              My Videos ({generations.length})
            </TabsTrigger>
          </TabsList>

          {/* Create Tab */}
          <TabsContent value="create">
            <Card className="mobile-card max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Generate UGC Video Script</CardTitle>
                <CardDescription>
                  AI-powered script generation using your favorite celebrity's persona
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Celebrity Selection */}
                <div className="space-y-2">
                  <Label htmlFor="celebrity">Select Celebrity *</Label>
                  <Select value={selectedCelebrity} onValueChange={setSelectedCelebrity}>
                    <SelectTrigger id="celebrity">
                      <SelectValue placeholder="Choose a celebrity" />
                    </SelectTrigger>
                    <SelectContent>
                      {celebrities.map((celeb) => (
                        <SelectItem key={celeb.id} value={celeb.id}>
                          {celeb.name} - {celeb.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Celebrity Display */}
                {selectedCelebrity && (
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/50">
                            {celebrities.find(c => c.id === selectedCelebrity)?.image_url ? (
                              <img
                                src={celebrities.find(c => c.id === selectedCelebrity)?.image_url}
                                alt={celebrities.find(c => c.id === selectedCelebrity)?.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <Video className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-primary-foreground" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {celebrities.find(c => c.id === selectedCelebrity)?.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {celebrities.find(c => c.id === selectedCelebrity)?.category}
                          </p>
                          <Badge variant="secondary" className="mt-1">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI-Powered Script
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Concept Input */}
                <div className="space-y-2">
                  <Label htmlFor="concept">Video Concept *</Label>
                  <Textarea
                    id="concept"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="Describe what you want the video to be about... (e.g., 'Review my new fitness app', 'Promote my coffee brand', 'Talk about mental health')"
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific about the product, message, or topic. AI will generate a natural, authentic script.
                  </p>
                </div>

                {/* Info Card */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Price per generation:</span>
                      <Badge variant="outline" className="text-base">
                        ₹{ugcPrice}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>AI-generated script in celebrity's voice</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>30-60 second professional script</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Celebrity avatar image included</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedCelebrity || !concept.trim() || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Script - ₹{ugcPrice}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Videos Tab */}
          <TabsContent value="my-videos" className="space-y-6">
            {generations.length === 0 ? (
              <Card className="mobile-card text-center p-8">
                <CardContent className="space-y-4">
                  <Video className="w-16 h-16 mx-auto text-muted-foreground" />
                  <CardTitle className="text-xl">No videos yet</CardTitle>
                  <p className="text-muted-foreground">
                    Create your first UGC video script to get started
                  </p>
                  <Button onClick={() => document.querySelector('[value="create"]')?.dispatchEvent(new Event('click'))}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Video
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {generations.map((gen) => (
                  <Card key={gen.id} className="mobile-card">
                    <CardContent className="p-0">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-muted">
                        {gen.thumbnail_url ? (
                          <img
                            src={gen.thumbnail_url}
                            alt={gen.celebrities.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-16 h-16 text-muted-foreground/30" />
                          </div>
                        )}
                        {/* Status Badge */}
                        {gen.status === 'completed' && gen.script && (
                          <Badge className="absolute top-2 right-2 bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Script Ready
                          </Badge>
                        )}
                        {gen.status === 'processing' && !gen.script && (
                          <Badge className="absolute top-2 right-2 bg-yellow-500">
                            <Clock className="w-3 h-3 mr-1 animate-spin" />
                            Generating...
                          </Badge>
                        )}
                        {gen.status === 'failed' && (
                          <Badge className="absolute top-2 right-2 bg-red-500">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                        {gen.heygen_video_id && !gen.video_url && (
                          <Badge variant="outline" className="absolute top-2 left-2 border-blue-500 text-blue-500 bg-background/95">
                            <Video className="w-3 h-3 mr-1" />
                            Video Processing
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg line-clamp-1">{gen.celebrities.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{gen.concept}</p>
                        </div>

                        {/* Always show script if it exists */}
                        {gen.script && (
                          <>
                            <div className="bg-muted/50 p-3 rounded-lg max-h-40 overflow-y-auto text-sm">
                              <pre className="whitespace-pre-wrap font-sans">{gen.script}</pre>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyScript(gen.script)}
                                className="flex-1"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Script
                              </Button>
                            </div>
                          </>
                        )}

                        {gen.status === 'processing' && !gen.script && (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            Generating your UGC script...
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span>Created: {new Date(gen.created_at).toLocaleDateString()}</span>
                          <span>₹{gen.price_paid}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Payment Method Selector */}
        <PaymentMethodSelector
          open={showPaymentSelector}
          onClose={() => setShowPaymentSelector(false)}
          onWalletPayment={handleWalletPayment}
          onRazorpayPayment={handleRazorpayPayment}
          amount={ugcPrice}
          walletBalance={walletBalance}
          title="UGC Video Script Generation"
          description="Generate AI-powered video script with your celebrity"
        />
      </div>
    </AuthenticatedLayout>
  );
}
