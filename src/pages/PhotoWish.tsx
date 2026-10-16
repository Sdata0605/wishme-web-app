import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateWishMePaymentId } from "@/utils/paymentId";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload, ImageIcon, Download, Sparkles, Wand2, History, X, Wallet, Send, Star, BadgePercent } from "lucide-react";
import { PricingDisplay } from "@/components/ui/discount-badge";
import { ServiceGuide } from "@/components/ui/service-guide";
import { photoWishGuide } from "@/data/service-guides";
const occasions = [
  "Birthday",
  "Anniversary",
  "Wedding",
  "Graduation",
  "New Year",
  "Diwali",
  "Christmas",
  "Valentine's Day",
  "Mother's Day",
  "Father's Day",
  "Friendship Day",
  "Congratulations",
  "Get Well Soon",
  "Thank You",
  "Other",
];

const textStyles = [
  { id: "elegant", name: "Elegant", description: "Sophisticated cursive with gold accents" },
  { id: "playful", name: "Playful", description: "Fun, bouncy fonts with bright colors" },
  { id: "modern", name: "Modern", description: "Clean, contemporary with gradients" },
  { id: "classic", name: "Classic", description: "Traditional serif with timeless feel" },
  { id: "festive", name: "Festive", description: "Celebratory with sparkles & glitter" },
];

interface PhotoWish {
  id: string;
  original_image_url: string;
  edited_image_url: string | null;
  occasion: string;
  recipient_name: string;
  wish_message: string;
  text_style: string;
  status: string;
  created_at: string;
}

export default function PhotoWish() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { balance: walletBalance, loading: walletLoading } = useWalletBalance();
  const { discountPercentage, planName, getDiscountedPrice } = usePlanDiscount();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [occasion, setOccasion] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [wishMessage, setWishMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [textStyle, setTextStyle] = useState("elegant");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<PhotoWish[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [basePrice, setBasePrice] = useState(99);
  const [loading, setLoading] = useState(true);

  const discountedPrice = getDiscountedPrice(basePrice);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  const loadData = async () => {
    try {
      // Load pricing
      const { data: pricingSetting } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "photo_wish_price")
        .single();

      if (pricingSetting) {
        setBasePrice(parseFloat(pricingSetting.setting_value));
      }

      // Load history
      const { data: historyData, error } = await supabase
        .from("photo_wishes")
        .select("*")
        .eq("user_id", profile?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && historyData) {
        setHistory(historyData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Compress image to reduce size and prevent timeouts
  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down if too large
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };

      img.onerror = reject;

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    try {
      // Compress image to prevent timeout issues with large files
      toast.info("Processing image...");
      const compressedImage = await compressImage(file);
      setSelectedImage(compressedImage);
      setGeneratedImage(null);
      console.log(`Original size: ${file.size}, Compressed length: ${compressedImage.length}`);
    } catch (error) {
      console.error("Image compression error:", error);
      toast.error("Failed to process image. Please try another.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error("Please upload an image first");
      return;
    }
    if (!occasion) {
      toast.error("Please select an occasion");
      return;
    }
    if (!recipientName.trim()) {
      toast.error("Please enter the recipient's name");
      return;
    }
    if (!wishMessage.trim()) {
      toast.error("Please enter a wish message");
      return;
    }
    if (walletBalance < discountedPrice) {
      toast.error("Insufficient wallet balance. Please add funds.");
      navigate("/wallet");
      return;
    }

    setIsGenerating(true);
    
    // Create a timeout to handle long-running requests
    const timeoutId = setTimeout(() => {
      toast.info("Generation is taking longer than expected. Please wait...");
    }, 15000);
    
    try {
      console.log("Calling generate-photo-wish function...");
      
      const { data, error } = await supabase.functions.invoke("generate-photo-wish", {
        body: {
          originalImageBase64: selectedImage,
          occasion,
          recipientName: recipientName.trim(),
          wishMessage: wishMessage.trim(),
          senderName: senderName.trim() || null,
          textStyle,
        },
      });

      clearTimeout(timeoutId);
      
      console.log("Function response:", { data, error });

      if (error) {
        console.error("Function invoke error:", error);
        throw new Error(error.message || "Failed to connect to server");
      }

      if (data?.error) {
        console.error("Function returned error:", data.error);
        throw new Error(data.error);
      }

      if (!data?.editedImageUrl) {
        console.error("No edited image URL in response:", data);
        throw new Error("No image was generated. Please try again.");
      }

      setGeneratedImage(data.editedImageUrl);

      // Generate WishMe Payment ID
      try {
        const wmId = generateWishMePaymentId();
        await supabase.from('payment_transactions').insert({
          wishme_payment_id: wmId,
          user_id: profile?.id,
          amount: Math.round(discountedPrice),
          payment_method: 'wallet',
          service_type: 'photo_wish',
          photo_wish_id: data.photoWishId,
          description: `Photo Wish - ${occasion} for ${recipientName}`,
          status: 'completed',
          paid_at: new Date().toISOString(),
        });
      } catch (e) { console.warn('Payment ID generation failed:', e); }

      toast.success("Photo wish generated successfully!");
      loadData();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate photo wish";
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imageUrl?: string) => {
    const url = imageUrl || generatedImage;
    if (!url) return;

    const link = document.createElement("a");
    link.href = url;
    link.download = `photo-wish-${recipientName || "download"}-${occasion || "wish"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  const clearImage = () => {
    setSelectedImage(null);
    setGeneratedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const todayGenerations = history.filter((h) => {
    const today = new Date().toDateString();
    const genDate = new Date(h.created_at).toDateString();
    return today === genDate;
  }).length;

  const completedCount = history.filter((h) => h.status === "completed").length;

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Wand2 className="h-8 w-8 text-primary" />
            Photo Wish
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload a photo of your loved one and we'll add a beautiful, stylized wish text overlay to create a personalized greeting
          </p>
        </div>

        <ServiceGuide {...photoWishGuide} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-2xl font-bold">
                    <Wallet className="w-6 h-6 text-primary" />
                    <span>₹{walletLoading ? "..." : walletBalance.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Wallet Balance</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/wallet")}>
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
                <span>{completedCount}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Created</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column - Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Create Your Photo Wish</CardTitle>
                  <CardDescription>Fill in the details to generate your personalized photo wish</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label>Upload Photo *</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        selectedImage ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {selectedImage ? (
                        <div className="relative">
                          <img src={selectedImage} alt="Selected" className="max-h-48 mx-auto rounded-lg" />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-0 right-0 h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearImage();
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Upload className="h-10 w-10" />
                          <p>Click to upload or drag and drop</p>
                          <p className="text-sm">PNG, JPG up to 10MB</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </div>

                  {/* Occasion */}
                  <div className="space-y-2">
                    <Label>Occasion *</Label>
                    <Select value={occasion} onValueChange={setOccasion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an occasion" />
                      </SelectTrigger>
                      <SelectContent>
                        {occasions.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recipient Name */}
                  <div className="space-y-2">
                    <Label>Recipient's Name *</Label>
                    <Input
                      placeholder="e.g., Mom, John, Priya"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>

                  {/* Wish Message */}
                  <div className="space-y-2">
                    <Label>Wish Message *</Label>
                    <Textarea
                      placeholder="Write your heartfelt wish message..."
                      value={wishMessage}
                      onChange={(e) => setWishMessage(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Sender Name */}
                  <div className="space-y-2">
                    <Label>Your Name (Optional)</Label>
                    <Input placeholder="e.g., From Rahul" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                  </div>

                  {/* Text Style */}
                  <div className="space-y-2">
                    <Label>Text Style</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {textStyles.map((style) => (
                        <div
                          key={style.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            textStyle === style.id
                              ? "border-primary bg-primary/10 ring-2 ring-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setTextStyle(style.id)}
                        >
                          <p className="font-medium text-sm">{style.name}</p>
                          <p className="text-xs text-muted-foreground">{style.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <PricingDisplay
                    basePrice={basePrice}
                    discountedPrice={discountedPrice}
                    discountPercentage={discountPercentage}
                    planName={planName}
                    label="Generation Cost"
                  />

                  {/* Validation Helper */}
                  {(!selectedImage || !occasion || !recipientName.trim() || !wishMessage.trim()) && (
                    <div className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="font-medium mb-1">Please complete the following:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        {!selectedImage && <li>Upload a photo</li>}
                        {!occasion && <li>Select an occasion</li>}
                        {!recipientName.trim() && <li>Enter recipient's name</li>}
                        {!wishMessage.trim() && <li>Enter a wish message</li>}
                      </ul>
                    </div>
                  )}

                  {/* Generate Button - Added all validation conditions */}
                  <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !selectedImage || !occasion || !recipientName.trim() || !wishMessage.trim() || walletBalance < discountedPrice} 
                    className="w-full" 
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generate Photo Wish - ₹{discountedPrice}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Right Column - Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>Your generated photo wish will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {isGenerating ? (
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Creating your photo wish...</p>
                        <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
                      </div>
                    ) : generatedImage ? (
                      <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>Your generated photo wish will appear here</p>
                      </div>
                    )}
                  </div>

                  {generatedImage && (
                    <Button onClick={() => handleDownload()} className="w-full mt-4" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Photo Wish
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Your Photo Wishes</CardTitle>
                <CardDescription>View and download your previously created photo wishes</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No photo wishes yet</p>
                    <p className="text-sm mt-2">Create your first photo wish to get started!</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {history.map((wish) => (
                      <Card key={wish.id} className="overflow-hidden">
                        <div className="aspect-square bg-muted">
                          {wish.edited_image_url ? (
                            <img src={wish.edited_image_url} alt={wish.occasion} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={wish.status === "completed" ? "default" : "secondary"}>{wish.status}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(wish.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-medium truncate">{wish.recipient_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{wish.occasion}</p>
                          {wish.edited_image_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => handleDownload(wish.edited_image_url!)}
                            >
                              <Download className="h-4 w-4 mr-2" />
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
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
