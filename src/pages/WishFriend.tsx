import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscribedCelebrities } from "@/hooks/useSubscribedCelebrities";
import { SubscribedCelebrityChips } from "@/components/celebrity/SubscribedCelebrityChips";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, CheckCircle, Clapperboard, Gift, Loader2, Search, ShoppingBag, Sparkles, Video, Wallet } from "lucide-react";

type WishType = "greeting_card" | "ugc_video" | "video_wish";
type Step = "type" | "details" | "review" | "done";

interface Celebrity {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  delivery_time: string | null;
  service_prices: { general_wish?: number; ugc_ad?: number } | null;
}

const OCCASIONS = [
  "Birthday", "Anniversary", "Wedding", "Graduation", "Congratulations",
  "Get Well Soon", "Thank You", "Farewell", "Festival", "Other",
];
const TONES = ["Heartfelt", "Funny", "Romantic", "Energetic", "Formal"];
const HOOK_STYLES = [
  { value: "question", label: "Question hook" },
  { value: "bold_claim", label: "Bold statement" },
  { value: "testimonial", label: "Personal story" },
  { value: "curiosity", label: "Curiosity hook" },
];
const ASPECT_RATIOS = [
  { value: "9:16", label: "Vertical 9:16 (Reels, Status)" },
  { value: "1:1", label: "Square 1:1" },
  { value: "16:9", label: "Horizontal 16:9" },
];

const WISH_OPTIONS: { type: WishType; title: string; description: string; icon: typeof Gift; tag: string; cta: string; gradient: string }[] = [
  {
    type: "greeting_card",
    title: "Greeting Card",
    description: "An AI-designed card for your friend, ready in seconds.",
    icon: Gift,
    tag: "Instant",
    cta: "Create a card",
    gradient: "from-[#EC4899] to-[#B44CFF]",
  },
  {
    type: "ugc_video",
    title: "UGC Video",
    description: "A creator-style video made just for your friend. Our team makes it and delivers it to My Bookings.",
    icon: Video,
    tag: "Made by our team",
    cta: "Request a video",
    gradient: "from-[#FF6B33] to-[#E8527A]",
  },
  {
    type: "video_wish",
    title: "Video Wish + Card",
    description: "A personalised video from a celebrity, with a greeting card signed by them. Our team makes both and delivers them to My Bookings.",
    icon: Clapperboard,
    tag: "Made by our team",
    cta: "Pick a celebrity",
    gradient: "from-[#4B83FF] to-[#7B2FFF]",
  },
];

const HOW_IT_WORKS = [
  "Choose a style and, for videos, a celebrity.",
  "Tell us your friend's name, the occasion and your idea.",
  "Our team makes it and delivers it to My Bookings.",
];

/**
 * Wish a Friend, and (with `fixedType`) the UGC Videos page: the same order flow, which starts at the
 * celebrity step. The user pays, the order goes to the admin, the admin uploads the finished video and,
 * when the order is completed, the chosen celebrity is paid their cut.
 */
export default function WishFriend({ fixedType }: { fixedType?: "ugc_video" } = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { balance, refetch: refetchWallet } = useWalletBalance();
  const { discountPercentage, getDiscountedPrice } = usePlanDiscount();

  const [step, setStep] = useState<Step>(fixedType ? "details" : "type");
  const [wishType, setWishType] = useState<Exclude<WishType, "greeting_card">>(fixedType ?? "video_wish");
  // Only celebrities the user has subscribed to can be chosen, as chips on the details screen.
  const subscribed = useSubscribedCelebrities<Celebrity>("id, name, category, image_url, delivery_time, service_prices");
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null);
  const [ugcFallbackPrice, setUgcFallbackPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [paid, setPaid] = useState(0);

  const [recipientName, setRecipientName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [relationship, setRelationship] = useState("");
  const [tone, setTone] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [hookStyle, setHookStyle] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "ugc_video_price")
      .maybeSingle()
      .then(({ data }) => setUgcFallbackPrice(parseInt(data?.setting_value ?? "0", 10) || 0));
  }, []);

  const basePriceFor = (c: Celebrity | null) => {
    if (!c) return 0;
    if (wishType === "video_wish") return c.service_prices?.general_wish ?? 0;
    return c.service_prices?.ugc_ad || ugcFallbackPrice;
  };

  const basePrice = basePriceFor(celebrity);
  const price = getDiscountedPrice(basePrice);
  const typeLabel = wishType === "video_wish" ? "Video Wish + Card" : "UGC Video";

  const detailsValid = useMemo(
    () => !!celebrity && basePrice > 0 && !!recipientName.trim() && !!occasion && prompt.trim().length >= 10,
    [celebrity, basePrice, recipientName, occasion, prompt],
  );

  const uploadReferenceImage = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      toast({ title: "Choose an image under 8 MB", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/wish-friend-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("promotional-content").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      setReferenceImageUrl(supabase.storage.from("promotional-content").getPublicUrl(path).data.publicUrl);
    } catch (e: any) {
      toast({ title: "Photo upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const pickType = (type: WishType) => {
    if (type === "greeting_card") {
      navigate("/greeting-cards");
      return;
    }
    if (type === "ugc_video") {
      navigate("/ugc-videos");
      return;
    }
    setWishType(type);
    setStep("details");
  };

  const goBack = () => {
    if (step === "details") { if (fixedType) navigate(-1); else setStep("type"); }
    else if (step === "review") setStep("details");
  };

  const submit = async () => {
    if (!celebrity) return;
    if (balance < price) {
      toast({
        title: "Insufficient wallet balance",
        description: `You need ₹${price.toLocaleString()} but have ₹${balance.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_wish_friend_order" as any, {
        p_order_type: wishType,
        p_celebrity_id: celebrity.id,
        p_recipient_name: recipientName,
        p_occasion: occasion,
        p_relationship: relationship,
        p_tone: tone,
        p_prompt: prompt,
        ...(wishType === "ugc_video" && {
          p_aspect_ratio: aspectRatio,
          p_hook_style: hookStyle,
          p_call_to_action: callToAction,
          p_reference_image_url: referenceImageUrl,
        }),
      });
      if (error) throw error;
      setPaid((data as any)?.price_paid ?? price);
      refetchWallet();
      setStep("done");
    } catch (e: any) {
      console.error("create_wish_friend_order failed", e);
      toast({ title: "Could not place order", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(fixedType ? "details" : "type");
    setCelebrity(null);
    setRecipientName("");
    setOccasion("");
    setRelationship("");
    setTone("");
    setPrompt("");
    setHookStyle("");
    setCallToAction("");
    setReferenceImageUrl("");
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 pt-20 md:pt-24 mobile-safe-bottom max-w-5xl">
        {step === "type" ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF6B33] via-[#E8527A] to-[#B44CFF] text-white px-6 py-10 md:px-12 md:py-14 mb-8 md:mb-10 shadow-xl">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
            <div className="relative max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Wish a Friend
              </span>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-3">
                {fixedType ? "UGC Videos with a celebrity" : "Make your friend's day unforgettable"}
              </h1>
              <p className="text-white/90 text-base md:text-lg">
                {fixedType
                  ? "Pick a celebrity, tell us about your video, and our team makes it and delivers it to My Bookings."
                  : "Send a greeting card or a personalised video wish. Choose a style, tell us about your friend, and we handle the rest."}
              </p>
              <Button variant="secondary" size="sm" className="mt-6" onClick={() => navigate("/bookings?tab=wish-friend")}>
                <ShoppingBag className="w-4 h-4 mr-2" /> My Wish a Friend orders
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-6 md:mb-8 text-center">
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Wish a Friend</h1>
            <p className="text-muted-foreground">{`${typeLabel} request`}</p>
          </div>
        )}

        {step !== "type" && step !== "done" && (
          <Button variant="ghost" size="sm" onClick={goBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        )}

        {step === "type" && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {WISH_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => pickType(option.type)}
                    className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${option.gradient} p-6 text-left text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40`}
                  >
                    <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex flex-col h-full gap-3 min-h-[220px]">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-medium rounded-full bg-white/20 px-2.5 py-1">{option.tag}</span>
                      </div>
                      <h3 className="text-xl font-bold mt-2">{option.title}</h3>
                      <p className="text-sm text-white/90 flex-1">{option.description}</p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold">
                        {option.cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4 text-center">How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {HOW_IT_WORKS.map((item, i) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                    <p className="text-sm text-muted-foreground pt-1">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "details" && (
          <Card>
            <CardHeader>
              <CardTitle>Tell us about your friend</CardTitle>
              <CardDescription>
                {typeLabel}{celebrity ? ` with ${celebrity.name}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Celebrity *</Label>
                <SubscribedCelebrityChips<Celebrity>
                  celebrities={subscribed.celebrities}
                  loading={subscribed.loading}
                  hasNone={subscribed.hasNone}
                  selectedId={celebrity?.id}
                  onSelect={(c) => setCelebrity(c)}
                  priceFor={(c) => {
                    const base = basePriceFor(c);
                    return base > 0 ? getDiscountedPrice(base) : null;
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wf-name">Friend's name *</Label>
                <Input id="wf-name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Priya" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Occasion *</Label>
                  <Select value={occasion} onValueChange={setOccasion}>
                    <SelectTrigger><SelectValue placeholder="Select occasion" /></SelectTrigger>
                    <SelectContent>
                      {OCCASIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger><SelectValue placeholder="Select tone (optional)" /></SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wf-rel">Your relationship</Label>
                <Input id="wf-rel" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. Best friend, sister, colleague (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wf-prompt">What should the video say? *</Label>
                <Textarea
                  id="wf-prompt"
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 600))}
                  placeholder="Describe your idea, memories to mention, inside jokes, or the exact message you want."
                />
                <p className="text-xs text-muted-foreground text-right">{prompt.length} / 600 (minimum 10)</p>
              </div>
              {wishType === "ugc_video" && (
                <div className="space-y-4 rounded-lg border p-4">
                  <p className="text-sm font-medium">UGC video details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Video format</Label>
                      <Select value={aspectRatio} onValueChange={setAspectRatio}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASPECT_RATIOS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Opening style</Label>
                      <Select value={hookStyle} onValueChange={setHookStyle}>
                        <SelectTrigger><SelectValue placeholder="Select style (optional)" /></SelectTrigger>
                        <SelectContent>
                          {HOOK_STYLES.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wf-cta">Closing line</Label>
                    <Input id="wf-cta" value={callToAction} onChange={(e) => setCallToAction(e.target.value)} placeholder="e.g. Happy birthday, see you soon! (optional)" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wf-photo">Reference photo (optional)</Label>
                    <p className="text-xs text-muted-foreground">A photo of your friend or the item to feature. Helps our team match your idea.</p>
                    <div className="flex items-center gap-3">
                      <Input id="wf-photo" type="file" accept="image/*" disabled={uploadingImage} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadReferenceImage(f); }} />
                      {uploadingImage && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    {referenceImageUrl && <img src={referenceImageUrl} alt="Reference" className="h-24 rounded-lg object-cover" />}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button disabled={!detailsValid || uploadingImage} onClick={() => setStep("review")}>Review order</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "review" && celebrity && (
          <Card>
            <CardHeader><CardTitle>Review and pay</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <img src={celebrity.image_url || "/placeholder.svg"} alt={celebrity.name} className="w-14 h-14 rounded-full object-cover" />
                <div>
                  <p className="font-semibold">{celebrity.name}</p>
                  <p className="text-sm text-muted-foreground">{typeLabel}{celebrity.delivery_time ? ` · ${celebrity.delivery_time}` : ""}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
                <p><span className="font-medium">For:</span> {recipientName}</p>
                <p><span className="font-medium">Occasion:</span> {occasion}</p>
                {tone && <p><span className="font-medium">Tone:</span> {tone}</p>}
                {relationship && <p><span className="font-medium">Relationship:</span> {relationship}</p>}
                <p className="whitespace-pre-wrap"><span className="font-medium">Prompt:</span> {prompt}</p>
                {wishType === "ugc_video" && (
                  <>
                    <p><span className="font-medium">Format:</span> {aspectRatio}</p>
                    {hookStyle && <p><span className="font-medium">Opening style:</span> {HOOK_STYLES.find((h) => h.value === hookStyle)?.label}</p>}
                    {callToAction && <p><span className="font-medium">Closing line:</span> {callToAction}</p>}
                    {referenceImageUrl && <img src={referenceImageUrl} alt="Reference" className="h-20 rounded-lg object-cover mt-1" />}
                  </>
                )}
              </div>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{typeLabel}</span>
                  <span>
                    {discountPercentage > 0 && <span className="line-through text-muted-foreground mr-2">₹{basePrice.toLocaleString()}</span>}
                    ₹{price.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-primary">₹{price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><Wallet className="w-4 h-4" /> Wallet balance</span>
                  <span>₹{balance.toLocaleString()}</span>
                </div>
              </div>
              {balance < price && (
                <div className="flex items-center justify-between rounded-lg border border-destructive/40 p-3 text-sm">
                  <span>You need ₹{(price - balance).toLocaleString()} more in your wallet.</span>
                  <Button size="sm" variant="outline" onClick={() => navigate("/wallet")}>Add funds</Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Your request goes to our team. They make your video, check it, and deliver it to My Orders.
              </p>
              <div className="flex justify-end">
                <Button disabled={submitting || !profile || balance < price} onClick={submit}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing order</> : `Pay ₹${price.toLocaleString()} from wallet`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <CheckCircle className="w-14 h-14 mx-auto text-green-500" />
              <h2 className="text-xl font-semibold">Request sent</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We received your {typeLabel.toLowerCase()} request (₹{paid.toLocaleString()} paid). Our team will make it and
                deliver it under My Orders, in the Wish a Friend tab.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate("/bookings?tab=wish-friend")}>View My Orders</Button>
                <Button variant="outline" onClick={reset}>Send another</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
