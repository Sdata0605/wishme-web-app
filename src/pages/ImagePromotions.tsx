import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generateWishMePaymentId } from "@/utils/paymentId";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";
import { useCelebrityFavorites } from "@/hooks/useCelebrityFavorites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader, Wallet, Image as ImageIcon, Download, Star, StarOff, Upload, Sparkles, AlertCircle, Lock, Heart, BadgePercent } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PricingDisplay } from "@/components/ui/discount-badge";
import { ServiceGuide } from "@/components/ui/service-guide";
import { imagePromotionsGuide } from "@/data/service-guides";

export default function ImagePromotions() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { favorites, loading: favLoading } = useCelebrityFavorites();
  const { discountPercentage, planName, getDiscountedPrice } = usePlanDiscount();
  
  const { balance: walletBalance, loading: walletLoading } = useWalletBalance();
  const [baseImagePrice, setBaseImagePrice] = useState(25);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedCelebrity, setSelectedCelebrity] = useState("");
  const [concept, setConcept] = useState("");
  const [brandingDetails, setBrandingDetails] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageSource, setReferenceImageSource] = useState<string>('none');

  const imagePrice = getDiscountedPrice(baseImagePrice);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (favorites.length > 0) {
      loadCelebrities();
    }
  }, [favorites]);

  useEffect(() => {
    const celebId = searchParams.get('celebrity');
    if (celebId) {
      setSelectedCelebrity(celebId);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load pricing
      const { data: pricingSetting } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'image_promotion_price')
        .single();

      if (pricingSetting) {
        setBaseImagePrice(parseInt(pricingSetting.setting_value));
      }

      // Load generation history
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        const { data: generations } = await supabase
          .from('image_promotions' as any)
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (generations) {
          setHistory(generations as any);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load image promotions data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCelebrities = async () => {
    try {
      // Only load celebrities the user is subscribed to
      const { data: celebsData } = await supabase
        .from('celebrities')
        .select('id, name, category, avatar_trained, image_url')
        .eq('is_active', true)
        .eq('avatar_trained', true)
        .in('id', favorites)
        .order('name');

      if (celebsData) {
        setCelebrities(celebsData);
      }
    } catch (error) {
      console.error('Error loading celebrities:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setReferenceImage(reader.result as string);
      setReferenceImageSource('upload');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!selectedCelebrity || !concept) {
      toast({
        title: "Missing Information",
        description: "Please select a celebrity and provide a concept",
        variant: "destructive"
      });
      return;
    }

    if (walletBalance < imagePrice) {
      toast({
        title: "Insufficient Balance",
        description: `You need ₹${imagePrice} to generate an image promotion. Please add funds to your wallet.`,
        variant: "destructive"
      });
      navigate('/wallet');
      return;
    }

    setIsGenerating(true);
    setCurrentGeneration(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('generate-image-promotion', {
        body: {
          celebrityId: selectedCelebrity,
          concept,
          brandingDetails,
          referenceImageUrl: referenceImage,
          referenceImageSource
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes('Insufficient')) {
          navigate('/wallet');
        }
        throw new Error(data.error);
      }

      setCurrentGeneration(data.generation);

      // Generate WishMe Payment ID
      try {
        const wmId = generateWishMePaymentId();
        const genId = data.generation?.id;
        await supabase.from('payment_transactions').insert({
          wishme_payment_id: wmId,
          user_id: (await supabase.from('profiles').select('id').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single()).data?.id,
          amount: Math.round(imagePrice),
          payment_method: 'wallet',
          service_type: 'image_promotion',
          image_promotion_id: genId,
          description: `Image Promotion`,
          status: 'completed',
          paid_at: new Date().toISOString(),
        });
        if (genId) {
          await supabase.from('image_promotions' as any).update({ wishme_payment_id: wmId }).eq('id', genId);
        }
      } catch (e) { console.warn('Payment ID generation failed:', e); }
      
      toast({
        title: "Success! 🎉",
        description: "Your image promotion has been generated"
      });

      // Reload history
      loadData();

    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate image promotion",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `image-promotion-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || favLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin" />
        </div>
      </AuthenticatedLayout>
    );
  }

  // Show subscription gate if no favorites
  if (favorites.length === 0) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto py-12 px-4 pt-24">
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Subscribe to Celebrities First</CardTitle>
              <CardDescription className="text-base">
                You need to subscribe to at least one celebrity to generate image promotions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg text-left">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  What you get with a subscription:
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• AI-powered image promotions with celebrity avatars</li>
                  <li>• UGC video generation featuring the celebrity</li>
                  <li>• Personalized video wishes for loved ones</li>
                  <li>• Lifetime access - pay once, use forever</li>
                </ul>
              </div>
              <Button onClick={() => navigate('/following')} size="lg" className="w-full sm:w-auto">
                Browse & Subscribe to Celebrities
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  const todayGenerations = history.filter(gen => {
    const today = new Date().toDateString();
    const genDate = new Date(gen.created_at).toDateString();
    return today === genDate;
  }).length;

  const completedCount = history.filter(gen => gen.status === 'completed').length;

  return (
    <AuthenticatedLayout>
      <div className="container max-w-7xl mx-auto px-3 md:px-6 py-6 md:py-8 pt-20 md:pt-24 space-y-6 mobile-safe-bottom">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            AI Image Promotions
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Generate promotional images featuring your favorite celebrities
          </p>
        </div>

        <ServiceGuide {...imagePromotionsGuide} />

        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="mobile-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-2xl font-bold">
                    <Wallet className="w-6 h-6 text-primary" />
                    <span>₹{walletBalance}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Wallet Balance</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/wallet')}>
                  Add Funds
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mobile-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-2xl font-bold">
                <ImageIcon className="w-6 h-6 text-purple-600" />
                <span>{todayGenerations}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Today's Generations</p>
            </CardContent>
          </Card>

          <Card className="mobile-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Star className="w-6 h-6 text-yellow-600" />
                <span>{completedCount}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Free Period Notice */}
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <Sparkles className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            🎉 <strong>FREE until Oct 13, 2025!</strong> Generate unlimited image promotions during our promotional period. 
            {discountPercentage > 0 && ` Your ${planName} plan gives you ${discountPercentage}% off!`}
          </AlertDescription>
        </Alert>

        {/* Main Generator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Create Image Promotion
              </CardTitle>
              <CardDescription>
                Generate AI-powered promotional images with celebrity avatars
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Celebrity Selection */}
              <div className="space-y-2">
                <Label htmlFor="celebrity">Select Celebrity *</Label>
                <Select value={selectedCelebrity} onValueChange={setSelectedCelebrity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a celebrity" />
                  </SelectTrigger>
                  <SelectContent>
                    {celebrities.map(celeb => (
                      <SelectItem key={celeb.id} value={celeb.id}>
                        {celeb.name} - {celeb.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {celebrities.length === 0 && (
                  <p className="text-xs text-muted-foreground">No celebrities with trained avatars available yet</p>
                )}
              </div>

              {/* Reference Image Tabs */}
              <Tabs defaultValue="none" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Reference
                  </TabsTrigger>
                  <TabsTrigger value="none">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Only
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-12 h-12 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload reference image
                        </p>
                        {referenceImage && referenceImageSource === 'upload' && (
                          <img src={referenceImage} alt="Reference" className="mt-4 max-h-32 rounded" />
                        )}
                      </div>
                    </Label>
                  </div>
                </TabsContent>

                <TabsContent value="none">
                  <p className="text-sm text-muted-foreground text-center py-4">
                    AI will generate a completely original design based on your concept
                  </p>
                </TabsContent>
              </Tabs>

              {/* Form Fields */}
              <div className="space-y-2">
                <Label htmlFor="concept">Promotion Concept *</Label>
                <Textarea
                  id="concept"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Describe what you want promoted (e.g., 'New smartphone launch with futuristic design')"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">{concept.length}/500 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branding">Branding Details (Optional)</Label>
                <Textarea
                  id="branding"
                  value={brandingDetails}
                  onChange={(e) => setBrandingDetails(e.target.value)}
                  placeholder="Brand name, logo placement, colors, tagline, etc."
                  rows={3}
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground">{brandingDetails.length}/300 characters</p>
              </div>

              {/* Pricing Display */}
              <PricingDisplay
                basePrice={baseImagePrice}
                discountedPrice={imagePrice}
                discountPercentage={discountPercentage}
                planName={planName}
                label="Generation Cost"
              />

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || walletBalance < imagePrice || !selectedCelebrity}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Image - ₹{imagePrice}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Column */}
          <div className="space-y-4">
            {currentGeneration && (
              <Card className="mobile-card">
                <CardHeader>
                  <CardTitle>Generated Image</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border">
                    <img
                      src={currentGeneration.generated_image_url}
                      alt="Generated promotion"
                      className="w-full"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleDownload(currentGeneration.generated_image_url)} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!currentGeneration && (
              <Card className="mobile-card">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Your generated image will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Generation History */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle>Generation History</CardTitle>
            <CardDescription>Your past image promotions</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No promotions generated yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map(gen => (
                  <Card key={gen.id} className="mobile-card overflow-hidden">
                    {gen.generated_image_url && (
                      <img
                        src={gen.generated_image_url}
                        alt="Promotion"
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded ${
                          gen.status === 'completed' ? 'bg-green-100 text-green-800' :
                          gen.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {gen.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(gen.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{gen.concept}</p>
                      {gen.generated_image_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleDownload(gen.generated_image_url)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
