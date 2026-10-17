import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Download, ImageIcon, Loader2, Sparkles, Upload, XCircle } from "lucide-react";
import { OrderDetailsList } from "@/components/admin/OrderDetailsList";

interface WishFriendOrderDialogProps {
  order: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  onChanged: () => void;
}

export function WishFriendOrderDialog({ order, open, onOpenChange, customerName, onChanged }: WishFriendOrderDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"upload" | "processing" | "reject" | "card" | "cardUpload" | null>(null);
  // The signature card of a video wish: what is on the order now, plus the admin's edits for the next try.
  const [card, setCard] = useState<{ url: string | null; text: string | null; source: string | null }>({ url: null, text: null, source: null });
  const [cardMessage, setCardMessage] = useState("");
  const [cardInstructions, setCardInstructions] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);

  useEffect(() => {
    setFile(null);
    setNotes(order?.admin_notes ?? "");
    setCard({ url: order?.card_url ?? null, text: order?.card_text ?? null, source: order?.card_source ?? null });
    setCardMessage(order?.card_text ?? "");
    setCardInstructions("");
    setCardFile(null);
  }, [order?.id]);

  if (!order) return null;

  const isOpen = order.status === "pending" || order.status === "processing";
  const isVideoWish = order.order_type !== "ugc_video";
  const typeLabel = isVideoWish ? "Video Wish + Signature Card" : "UGC Video";
  const needsCard = isVideoWish && !card.url;

  const makeCard = async () => {
    setBusy("card");
    try {
      const { data, error } = await supabase.functions.invoke("generate-wish-friend-card", {
        body: { orderId: order.id, message: cardMessage.trim() || undefined, instructions: cardInstructions.trim() || undefined },
      });
      if (error) {
        let msg = error.message;
        try { const b = await (error as any).context?.json?.(); msg = b?.error || msg; } catch { /* keep the generic message */ }
        throw new Error(msg);
      }
      if (!data?.success) throw new Error(data?.error || "The card could not be made");
      setCard({ url: data.card_url, text: data.card_text, source: "ai" });
      setCardMessage(data.card_text ?? "");
      toast({ title: "Signature card ready", description: "Check it below. Make it again or upload your own if it is not right." });
      onChanged();
    } catch (e: any) {
      toast({ title: "Card failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const uploadCard = async () => {
    if (!cardFile) return;
    setBusy("cardUpload");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const formData = new FormData();
      formData.append("file", cardFile);
      formData.append("order_id", order.id);
      formData.append("kind", "card");
      const { data, error } = await supabase.functions.invoke("upload-wish-friend-video", {
        body: formData,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Upload failed");
      setCard({ url: data.card_url, text: card.text, source: "upload" });
      setCardFile(null);
      toast({ title: "Card uploaded" });
      onChanged();
    } catch (e: any) {
      toast({ title: "Card upload failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (status: "processing" | "rejected") => {
    setBusy(status === "processing" ? "processing" : "reject");
    try {
      const { error } = await supabase
        .from("wish_friend_orders" as any)
        .update({ status, admin_notes: notes.trim() || null })
        .eq("id", order.id);
      if (error) throw error;
      toast({ title: status === "processing" ? "Marked as processing" : "Order rejected" });
      onChanged();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const upload = async () => {
    if (!file) return;
    setBusy("upload");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("order_id", order.id);
      if (notes.trim()) formData.append("admin_notes", notes.trim());

      const { data, error } = await supabase.functions.invoke("upload-wish-friend-video", {
        body: formData,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Upload failed");

      toast({ title: isVideoWish ? "Video and card delivered" : "Video delivered", description: "It now appears in the customer's My Orders." });
      onChanged();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{typeLabel} request</DialogTitle>
          <DialogDescription>
            {isVideoWish
              ? "Review the request, make the signature card, then upload the video to deliver both to the customer."
              : "Review the request, make the video, then upload it to deliver it to the customer."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><Label className="text-muted-foreground">Order ID</Label><p className="font-mono">{order.id}</p></div>
            <div><Label className="text-muted-foreground">Status</Label><div><Badge variant="outline">{order.status}</Badge></div></div>
            <div><Label className="text-muted-foreground">Customer</Label><p>{customerName}</p></div>
            <div><Label className="text-muted-foreground">Amount paid</Label><p className="font-semibold">₹{(order.price_paid ?? 0).toLocaleString()}</p></div>
            <div><Label className="text-muted-foreground">Celebrity</Label><p>{order.celebrities?.name || "N/A"}</p></div>
            <div><Label className="text-muted-foreground">Type</Label><p>{typeLabel}</p></div>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">What the customer wants</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">For:</span> <span className="font-medium">{order.recipient_name}</span></p>
              <p><span className="text-muted-foreground">Occasion:</span> <span className="font-medium">{order.occasion}</span></p>
              {order.relationship && <p><span className="text-muted-foreground">Relationship:</span> {order.relationship}</p>}
              {order.tone && <p><span className="text-muted-foreground">Tone:</span> {order.tone}</p>}
              <div>
                <Label className="text-muted-foreground">Prompt</Label>
                <p className="bg-muted p-3 rounded whitespace-pre-wrap">{order.prompt}</p>
              </div>
              {order.order_type === "ugc_video" && (
                <div className="space-y-1 pt-2 border-t">
                  {order.aspect_ratio && <p><span className="text-muted-foreground">Format:</span> {order.aspect_ratio}</p>}
                  {order.hook_style && <p><span className="text-muted-foreground">Opening style:</span> {order.hook_style.replace("_", " ")}</p>}
                  {order.call_to_action && <p><span className="text-muted-foreground">Closing line:</span> {order.call_to_action}</p>}
                  {order.reference_image_url && (
                    <div>
                      <Label className="text-muted-foreground">Reference photo</Label>
                      <a href={order.reference_image_url} target="_blank" rel="noreferrer">
                        <img src={order.reference_image_url} alt="Reference" className="h-40 rounded-lg object-cover mt-1" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <OrderDetailsList details={order.order_details} />

          {order.status === "completed" && order.video_url ? (
            <Card className="border-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Video delivered</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {card.url && (
                  <a href={card.url} target="_blank" rel="noreferrer" className="block">
                    <img src={card.url} alt="Signature card" className="w-full max-h-96 object-contain rounded-lg border bg-muted" />
                  </a>
                )}
                <video src={order.video_url} controls className="w-full max-h-64 rounded-lg bg-black" />
                <Button variant="outline" className="w-full" onClick={() => window.open(order.video_url, "_blank")}>
                  <Download className="w-4 h-4 mr-2" /> Download video
                </Button>
              </CardContent>
            </Card>
          ) : order.status === "rejected" ? (
            <Card className="border-destructive">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /> Rejected</p>
                {order.admin_notes && <p className="text-muted-foreground mt-1">{order.admin_notes}</p>}
                <p className="text-xs text-muted-foreground mt-2">Refund the customer from Wallet Management if needed.</p>
              </CardContent>
            </Card>
          ) : isOpen ? (
            <>
            {isVideoWish && (
              <Card className={card.url ? "border-green-500" : "border-violet-500"}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {card.url ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Sparkles className="w-4 h-4 text-violet-500" />}
                    Step 1: Signature card
                    {card.source && <Badge variant="outline" className="ml-auto">{card.source === "ai" ? "Made by AI" : "Uploaded"}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    A greeting card from {order.celebrities?.name || "the celebrity"} to {order.recipient_name}, with the celebrity's photo and their name signed at the bottom. It is delivered together with the video.
                  </p>
                  {card.url ? (
                    <a href={card.url} target="_blank" rel="noreferrer" className="block">
                      <img src={card.url} alt="Signature card" className="w-full max-h-[28rem] object-contain rounded-lg border bg-muted" />
                    </a>
                  ) : (
                    <div className="h-40 rounded-lg border border-dashed flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                      <ImageIcon className="w-6 h-6" /> No card yet
                    </div>
                  )}
                  <div>
                    <Label htmlFor="wf-card-msg">Message on the card (leave empty and the AI writes it)</Label>
                    <Textarea id="wf-card-msg" rows={2} maxLength={150} value={cardMessage} onChange={(e) => setCardMessage(e.target.value)} disabled={busy !== null} placeholder={`e.g. Wishing you the happiest ${order.occasion}, ${order.recipient_name}!`} />
                    <p className="text-[11px] text-muted-foreground text-right">{cardMessage.length}/150</p>
                  </div>
                  <div>
                    <Label htmlFor="wf-card-ins">Extra design instructions (optional)</Label>
                    <Input id="wf-card-ins" value={cardInstructions} onChange={(e) => setCardInstructions(e.target.value)} disabled={busy !== null} placeholder="e.g. gold and white colours, balloons, no outdoor background" />
                  </div>
                  <Button className="w-full" disabled={busy !== null} onClick={makeCard}>
                    {busy === "card"
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Making the card (up to a minute)</>
                      : <><Sparkles className="w-4 h-4 mr-2" /> {card.url ? "Make it again" : "Generate signature card"}</>}
                  </Button>
                  <div className="pt-3 border-t space-y-2">
                    <Label htmlFor="wf-card-file">Or upload your own card (PNG, JPG, WebP, under 10 MB)</Label>
                    <Input id="wf-card-file" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy !== null} onChange={(e) => setCardFile(e.target.files?.[0] ?? null)} />
                    <Button variant="outline" className="w-full" disabled={!cardFile || busy !== null} onClick={uploadCard}>
                      {busy === "cardUpload" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading</> : <><Upload className="w-4 h-4 mr-2" /> Upload card</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="border-amber-500">
              <CardHeader className="pb-2"><CardTitle className="text-base">{isVideoWish ? "Step 2: Deliver the video" : "Deliver the video"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="wf-video-file">Video file (MP4, MOV, MKV, WebM, AVI)</Label>
                  <Input
                    id="wf-video-file"
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/avi,.mp4,.mov,.mkv,.webm,.avi"
                    disabled={busy !== null}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file && <p className="text-xs text-muted-foreground mt-1">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
                </div>
                <div>
                  <Label htmlFor="wf-notes">Note to customer (optional, required when rejecting)</Label>
                  <Textarea id="wf-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy !== null} />
                </div>
                {needsCard && <p className="text-xs text-amber-600">Make or upload the signature card first. The video and card are delivered together.</p>}
                <Button className="w-full" disabled={!file || busy !== null || needsCard} onClick={upload}>
                  {busy === "upload" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading</> : <><Upload className="w-4 h-4 mr-2" /> {isVideoWish ? "Upload video and deliver both" : "Upload and deliver"}</>}
                </Button>
                <div className="flex gap-2">
                  {order.status === "pending" && (
                    <Button variant="outline" className="flex-1" disabled={busy !== null} onClick={() => setStatus("processing")}>
                      {busy === "processing" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark as processing"}
                    </Button>
                  )}
                  <Button variant="destructive" className="flex-1" disabled={busy !== null || !notes.trim()} onClick={() => setStatus("rejected")}>
                    {busy === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
