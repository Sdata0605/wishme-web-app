import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

/**
 * Every order made with this celebrity, of every kind, in one list: video wishes and promotions (bookings),
 * image promotions, Wish a Friend, UGC videos and UGC ads. Open an order to see everything the customer asked
 * for and what was delivered (the video, the image, the card), as the admin sees it. The admin team fulfils
 * orders; the celebrity is paid when an order is completed.
 */

interface OrderItem {
  key: string;
  id: string;
  label: string;
  title: string;
  customer: string;
  price: number;
  status: string;
  created_at: string;
  /** What the celebrity was paid for this order (net of TDS), from the earnings ledger. */
  earned?: number;
  fields: Array<[string, string]>;
  images: string[];
  videoUrl?: string | null;
  cardUrl?: string | null;
}

/** What a status means to a celebrity, in plain words (the raw values are internal). */
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  pending_approval: "Pending",
  confirmed: "Being made",
  processing: "Being made",
  in_progress: "Being made",
  accepted: "Being made",
  video_sent: "Delivered",
  delivered: "Delivered",
  completed: "Completed",
  rejected: "Rejected",
  declined: "Declined",
  failed: "Failed",
  cancelled: "Cancelled",
};
const DONE = ["completed", "video_sent", "delivered"];

const isHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u);
const asImage = (u?: string | null): string | null => (isHttp(u) ? u : null);
const text = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v)).trim();
const nameOf = (p?: { first_name?: string | null; last_name?: string | null } | null) =>
  p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Customer" : "Customer";

function addField(fields: Array<[string, string]>, label: string, value: unknown) {
  const v = text(value);
  if (v) fields.push([label, v]);
}

function badgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (DONE.includes(status)) return "default";
  if (["rejected", "declined", "failed", "cancelled"].includes(status)) return "destructive";
  if (["confirmed", "processing", "in_progress", "accepted"].includes(status)) return "secondary";
  return "outline";
}

export function OrdersTab({ celebrityId }: { celebrityId: string | undefined }) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!celebrityId) {
      setLoading(false);
      return;
    }
    try {
      const sb = supabase as any;
      const [b, p, w, a] = await Promise.all([
        sb.from("bookings").select("*, profiles!bookings_user_id_fkey (first_name, last_name)").eq("celebrity_id", celebrityId).order("created_at", { ascending: false }).limit(100),
        sb.from("image_promotions").select("*, profiles!image_promotions_user_id_fkey (first_name, last_name)").eq("celebrity_id", celebrityId).order("created_at", { ascending: false }).limit(100),
        sb.from("wish_friend_orders").select("*, profiles!wish_friend_orders_user_id_fkey (first_name, last_name)").eq("celebrity_id", celebrityId).order("created_at", { ascending: false }).limit(100),
        sb.from("ugc_ads").select("*").eq("celebrity_id", celebrityId).order("created_at", { ascending: false }).limit(100),
      ]);

      const items: OrderItem[] = [];

      for (const x of (b.data as any[]) ?? []) {
        let msg: any = null;
        try { if (x.message) msg = JSON.parse(x.message); } catch { /* plain text */ }
        const req = msg?.requestDetails ?? msg?.step1 ?? {};
        const guide = msg?.creativeGuidelines ?? {};
        const fields: Array<[string, string]> = [];
        addField(fields, "For", req.recipientName);
        addField(fields, "Occasion", req.occasion);
        addField(fields, "Message", req.message ?? (msg ? "" : x.message));
        addField(fields, "Goal", guide.goal ?? x.instructions);
        addField(fields, "Tone", guide.toneAndStyle);
        addField(fields, "Delivery", x.delivery_type);
        addField(fields, "Delivery date", x.delivery_date);
        addField(fields, "Script", x.script_content ?? x.generated_script);
        items.push({
          key: `booking-${x.id}`, id: x.id,
          label: text(x.service_type || "booking").replace(/_/g, " "),
          title: text(req.recipientName) || "Booking",
          customer: nameOf(x.profiles), price: Number(x.final_price ?? 0), status: x.status, created_at: x.created_at,
          earned: DONE.includes(x.status) || x.status === "confirmed" ? Number(x.celebrity_commission ?? 0) || undefined : undefined,
          fields, images: [asImage(x.reference_image_url)].filter(Boolean) as string[],
          videoUrl: isHttp(x.video_url) ? x.video_url : null,
          cardUrl: isHttp(x.card_url) ? x.card_url : null,
        });
      }

      for (const x of (p.data as any[]) ?? []) {
        const fields: Array<[string, string]> = [];
        addField(fields, "Concept", x.concept);
        addField(fields, "Branding", x.branding_details);
        items.push({
          key: `promo-${x.id}`, id: x.id, label: "image promotion", title: text(x.concept).slice(0, 60) || "Image promotion",
          customer: nameOf(x.profiles), price: Number(x.price_paid ?? 0), status: x.status, created_at: x.created_at,
          fields, images: [asImage(x.generated_image_url)].filter(Boolean) as string[],
        });
      }

      for (const x of (w.data as any[]) ?? []) {
        const fields: Array<[string, string]> = [];
        addField(fields, "For", x.recipient_name);
        addField(fields, "Occasion", x.occasion);
        addField(fields, "Relationship", x.relationship);
        addField(fields, "Tone", x.tone);
        addField(fields, "What to say", x.prompt);
        addField(fields, "Format", x.aspect_ratio);
        addField(fields, "Opening style", x.hook_style);
        addField(fields, "Closing line", x.call_to_action);
        items.push({
          key: `friend-${x.id}`, id: x.id, label: x.order_type === "ugc_video" ? "UGC video" : "video wish",
          title: `${text(x.recipient_name) || "Friend"}${x.occasion ? ` - ${x.occasion}` : ""}`,
          customer: nameOf(x.profiles), price: Number(x.price_paid ?? 0), status: x.status, created_at: x.created_at,
          fields, images: [asImage(x.reference_image_url)].filter(Boolean) as string[],
          videoUrl: isHttp(x.video_url) ? x.video_url : null,
        });
      }

      for (const x of (a.data as any[]) ?? []) {
        const fields: Array<[string, string]> = [];
        addField(fields, "Product", x.product_name);
        addField(fields, "About", x.product_description);
        addField(fields, "Brief", x.prompt);
        addField(fields, "Format", x.aspect_ratio);
        addField(fields, "Opening style", x.hook_style);
        addField(fields, "Closing line", x.call_to_action);
        items.push({
          key: `ad-${x.id}`, id: x.id, label: "UGC ad", title: text(x.product_name) || "UGC ad",
          customer: "Customer", price: Number(x.price_paid ?? 0), status: x.status, created_at: x.created_at,
          fields, images: [asImage(x.product_image_url)].filter(Boolean) as string[],
          videoUrl: isHttp(x.video_url) ? x.video_url : null,
        });
      }

      // What the celebrity was actually paid on each order comes from the earnings ledger.
      if (items.length > 0) {
        const { data: ledger } = await sb
          .from("celebrity_wallet_transactions")
          .select("booking_id, amount")
          .eq("celebrity_id", celebrityId)
          .eq("transaction_type", "earning")
          .limit(1000);
        const earned = new Map<string, number>(((ledger as any[]) ?? []).map((l) => [l.booking_id as string, Number(l.amount)]));
        for (const it of items) if (earned.has(it.id)) it.earned = earned.get(it.id);
      }

      items.sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
      setOrders(items);
    } catch (e) {
      console.error("Error fetching orders:", e);
    } finally {
      setLoading(false);
    }
  }, [celebrityId]);

  useEffect(() => {
    fetchOrders();
    if (!celebrityId) return;
    // Live: an order made, delivered or paid shows up without a refresh.
    let channel = supabase.channel(`celebrity-orders-${celebrityId}`);
    for (const table of ["bookings", "image_promotions", "wish_friend_orders", "ugc_ads", "celebrity_wallet_transactions"]) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `celebrity_id=eq.${celebrityId}` }, () => fetchOrders());
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [celebrityId, fetchOrders]);

  const done = useMemo(() => orders.filter((o) => DONE.includes(o.status)).length, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders ({orders.length})</CardTitle>
        {orders.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {done} completed · {orders.length - done} in progress or waiting
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.length === 0 && <p className="text-muted-foreground text-center py-8">No orders yet</p>}
        {orders.map((o) => {
          const isOpen = open === o.key;
          const isDone = DONE.includes(o.status);
          return (
            <div key={o.key} className="border rounded-lg">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/50 transition-colors rounded-lg"
                onClick={() => setOpen(isOpen ? null : o.key)}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{o.title}</p>
                  <p className="text-sm text-muted-foreground capitalize">{o.label} · {o.customer} · {new Date(o.created_at).toLocaleDateString("en-IN")}</p>
                  <p className={`text-xs mt-1 font-medium ${o.earned ? "text-green-600" : "text-muted-foreground"}`}>
                    {o.earned ? `You earned ₹${o.earned.toLocaleString("en-IN")}` : isDone ? "Earning is being added" : "You are paid when the order is completed"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium">₹{o.price.toLocaleString("en-IN")}</p>
                  <Badge variant={badgeVariant(o.status)}>{STATUS_LABELS[o.status] ?? o.status.replace(/_/g, " ")}</Badge>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                  {o.fields.map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                      <p className="text-sm whitespace-pre-wrap">{value}</p>
                    </div>
                  ))}
                  {o.images.map((src) => (
                    <img key={src} src={src} alt="Order" className="w-full max-w-md rounded-lg border" loading="lazy" />
                  ))}
                  {o.videoUrl && (
                    <video src={o.videoUrl} controls className="w-full max-w-md rounded-lg border" preload="metadata" />
                  )}
                  <div className="flex flex-wrap gap-2">
                    {o.videoUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a href={o.videoUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Open video</a>
                      </Button>
                    )}
                    {o.cardUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a href={o.cardUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Open card</a>
                      </Button>
                    )}
                  </div>
                  {!o.videoUrl && !o.cardUrl && o.images.length === 0 && o.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nothing delivered yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
