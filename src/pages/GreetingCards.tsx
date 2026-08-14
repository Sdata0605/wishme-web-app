import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader, Wallet, Send, Download, Star, StarOff, Upload, Image as ImageIcon, Sparkles, AlertCircle, BadgePercent } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ServiceGuide } from "@/components/ui/service-guide";
import { greetingCardsGuide } from "@/data/service-guides";

const OCCASIONS = [
  "Birthday",
  "Anniversary",
  "Wedding",
  "Graduation",
  "New Year",
  "Christmas",
  "Valentine's Day",
  "Mother's Day",
  "Father's Day",
  "Thank You",
  "Congratulations",
  "Get Well Soon"
];

export default function GreetingCards() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const { balance: walletBalance, loading: walletLoading } = useWalletBalance();
  const [cardPrice, setCardPrice] = useState(2);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountedPrice, setDiscountedPrice] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [occasion, setOccasion] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [refinePrompt, setRefinePrompt] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageSource, setReferenceImageSource] = useState<string>('none');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
  }, [profile?.plan]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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
        .eq('setting_key', 'greeting_card_price')
        .single();

      let basePrice = 2;
      if (pricingSetting) {
        basePrice = parseInt(pricingSetting.setting_value);
      }
      setCardPrice(basePrice);

      // Load discount from user's plan
      if (profile?.plan) {
        const { data: planData } = await supabase
          .from('plans')
          .select('service_discount_percentage')
          .eq('name', profile.plan)
          .single();

        if (planData?.service_discount_percentage) {
          const discount = planData.service_discount_percentage;
          setDiscountPercentage(discount);
          const finalPrice = Math.round(basePrice * (1 - discount / 100));
          setDiscountedPrice(finalPrice);
        } else {
          setDiscountPercentage(0);
          setDiscountedPrice(basePrice);
        }
      } else {
        setDiscountPercentage(0);
        setDiscountedPrice(basePrice);
      }

      // Load generation history with pagination to prevent crashes
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        const { data: generations } = await supabase
          .from('greeting_card_generations')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(30); // Reduced from 50 to 30 for performance

        if (generations) {
          setHistory(generations);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load greeting cards data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
    if (!occasion || !recipientName || !senderName || !prompt) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including your name",
        variant: "destructive"
      });
      return;
    }

    const priceToCharge = discountedPrice;

    if (walletBalance < priceToCharge) {
      toast({
        title: "Insufficient Balance",
        description: `You need ₹${priceToCharge} to generate a greeting card. Please add funds to your wallet.`,
        variant: "destructive"
      });
      navigate('/wallet');
      return;
    }

    setIsGenerating(true);
    setCurrentGeneration(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('generate-greeting-card-ai', {
        body: {
          prompt,
          occasionName: occasion,
          recipientName,
          senderName,
          refinePrompt,
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

      const generation = data.generation;
      setCurrentGeneration(generation);

      if (generation?.status === 'completed' && generation?.generated_image_url) {
        toast({
          title: "Success",
          description: "Your greeting card has been generated"
        });
        loadData();
      } else if (generation?.id) {
        toast({
          title: "Generating",
          description: "Your card is still processing. The image will appear when it is ready."
        });
        if (pollingRef.current) clearInterval(pollingRef.current);
        let attempts = 0;
        pollingRef.current = setInterval(async () => {
          attempts += 1;
          const { data: rows } = await supabase
            .from('greeting_card_generations')
            .select('status, generated_image_url, greeting_text, refined_prompt')
            .eq('id', generation.id)
            .limit(1);
          const row = rows?.[0];
          if (row?.status === 'completed' && row.generated_image_url) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setCurrentGeneration((prev: any) => prev ? { ...prev, ...row } : prev);
            toast({ title: "Success", description: "Your greeting card has been generated" });
            loadData();
            return;
          }
          if (row?.status === 'failed' || attempts >= 20) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            if (row?.status === 'failed') {
              setCurrentGeneration((prev: any) => prev ? { ...prev, status: 'failed' } : prev);
            }
          }
        }, 3000);
      }

    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate greeting card",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = async (id: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('greeting_card_generations')
        .update({ saved_to_library: !currentStatus })
        .eq('id', id);

      setHistory(prev => prev.map(gen => 
        gen.id === id ? { ...gen, saved_to_library: !currentStatus } : gen
      ));

      if (currentGeneration?.id === id) {
        setCurrentGeneration({ ...currentGeneration, saved_to_library: !currentStatus });
      }

      toast({
        title: currentStatus ? "Removed from Library" : "Saved to Library",
        description: currentStatus ? "Card removed from your library" : "Card saved to your library"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update library status",
        variant: "destructive"
      });
    }
  };

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `greeting-card-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin" />
        </div>
      </AuthenticatedLayout>
    );
  }

  const todayGenerations = history.filter(gen => {
    const today = new Date().toDateString();
    const genDate = new Date(gen.created_at).toDateString();
    return today === genDate;
  }).length;

  const libraryCount = history.filter(gen => gen.saved_to_library).length;

  return (
    <AuthenticatedLayout>
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <ServiceGuide {...greetingCardsGuide} />
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
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

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Send className="w-6 h-6 text-green-600" />
                <span>{todayGenerations}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Today's Generations</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Star className="w-6 h-6 text-yellow-600" />
                <span>{libraryCount}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Saved to Library</p>
            </CardContent>
          </Card>
        </div>

        {/* Discount Notice */}
        {discountPercentage > 0 ? (
          <Alert className="bg-primary/10 border-primary/20">
            <BadgePercent className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary">
              🎉 <strong>{discountPercentage}% {profile?.plan?.toUpperCase()} Plan Discount Applied!</strong> You're paying ₹{discountedPrice} instead of ₹{cardPrice} per card.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-muted border-muted-foreground/20">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground">
              💡 <strong>Upgrade to Premium or Elite</strong> to get up to 15% discount on all services! <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/plan')}>View Plans</Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Generate AI Greeting Card
            </CardTitle>
            <CardDescription>
              Create beautiful, personalized greeting cards powered by Gemini AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Upload Tabs */}
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="library">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Library
                </TabsTrigger>
                <TabsTrigger value="none">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Only
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-4 md:p-8 text-center">
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
                        Click to upload or drag & drop
                      </p>
                      {referenceImage && referenceImageSource === 'upload' && (
                        <img src={referenceImage} alt="Reference" className="mt-4 max-h-32 rounded" />
                      )}
                    </div>
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="library" className="space-y-4">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {history.filter(gen => gen.saved_to_library && gen.generated_image_url).map(gen => (
                    <div
                      key={gen.id}
                      onClick={() => {
                        setReferenceImage(gen.generated_image_url);
                        setReferenceImageSource('library');
                      }}
                      className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                        referenceImage === gen.generated_image_url ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img src={gen.generated_image_url} alt={gen.occasion_name} className="w-full h-24 object-cover" />
                    </div>
                  ))}
                </div>
                {libraryCount === 0 && (
                  <p className="text-center text-muted-foreground py-8">No cards saved to library yet</p>
                )}
              </TabsContent>

              <TabsContent value="none">
                <p className="text-sm text-muted-foreground text-center py-4">
                  AI will generate a completely original design based on your prompt
                </p>
              </TabsContent>
            </Tabs>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="occasion">Occasion *</Label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select occasion" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCASIONS.map(occ => (
                      <SelectItem key={occ} value={occ}>{occ}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Name *</Label>
                <Input
                  id="recipient"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g., Sarah, Mom, Dad"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender">Your Name (Sender) *</Label>
              <Input
                id="sender"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g., John, Your loving friend"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Your Prompt *</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the greeting card design you want... (e.g., 'A colorful birthday card with balloons and confetti')"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{prompt.length}/500 characters</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="refine"
                checked={refinePrompt}
                onCheckedChange={(checked) => setRefinePrompt(checked as boolean)}
              />
              <Label htmlFor="refine" className="cursor-pointer">
                Refine prompt with AI (recommended for better results)
              </Label>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || walletBalance < discountedPrice || !occasion || !recipientName || !senderName || !prompt}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Card</span>
                  {discountPercentage > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="line-through text-muted-foreground/70 text-sm">₹{cardPrice}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        ₹{discountedPrice}
                      </Badge>
                    </span>
                  ) : (
                    <span>- ₹{cardPrice}</span>
                  )}
                  💎
                </div>
              )}
            </Button>
            
            {(!occasion || !recipientName || !prompt) && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Please fill in all required fields to generate a card
              </p>
            )}
          </CardContent>
        </Card>

        {/* Current Generation Preview */}
        {currentGeneration && (
          <Card>
            <CardHeader>
              <CardTitle>Your Generated Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={currentGeneration.generated_image_url}
                  alt="Generated greeting card"
                  className="w-full"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                  <p className="text-sm font-medium">{currentGeneration.greeting_text}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleDownload(currentGeneration.generated_image_url)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSaveToLibrary(currentGeneration.id, currentGeneration.saved_to_library)}
                >
                  {currentGeneration.saved_to_library ? (
                    <>
                      <StarOff className="w-4 h-4 mr-2" />
                      Remove from Library
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Save to Library
                    </>
                  )}
                </Button>
              </div>

              {currentGeneration.refined_prompt && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>AI Refined Prompt:</strong> {currentGeneration.refined_prompt}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* History Gallery */}
        <Card>
          <CardHeader>
            <CardTitle>Your Greeting Cards</CardTitle>
            <CardDescription>View all your generated greeting cards</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No greeting cards generated yet</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {history.map(gen => (
                  <div key={gen.id} className="relative group rounded-lg overflow-hidden border">
                    <img
                      src={gen.generated_image_url}
                      alt={gen.occasion_name}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => setCurrentGeneration(gen)}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white text-xs">
                      <p className="font-semibold">{gen.occasion_name}</p>
                      <p>To: {gen.recipient_name}</p>
                      <p className="text-[10px] opacity-75">
                        {new Date(gen.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSaveToLibrary(gen.id, gen.saved_to_library)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full"
                    >
                      {gen.saved_to_library ? (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <Star className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}