import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, Loader2, Play, RefreshCw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Kind = "ad" | "video";
type Stage = "awaiting" | "production" | "ready" | "failed";
type Filter = "all" | "progress" | "ready" | "failed";

interface Item {
  id: string;
  title: string;
  subtitle: string;
  stage: Stage;
  price: number;
  createdAt: string;
  ratio: string;
  videoUrl: string | null;
  fileKey: string | null;
  thumb: string | null;
  note: string | null;
}

const STAGE: Record<Stage, { label: string; Icon: typeof Clock; color: string }> = {
  awaiting: { label: "Awaiting review", Icon: Clock, color: "#F59E0B" },
  production: { label: "In production", Icon: Loader2, color: "#3B82F6" },
  ready: { label: "Ready", Icon: CheckCircle, color: "#22C55E" },
  failed: { label: "Failed", Icon: AlertCircle, color: "#EF4444" },
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "progress", label: "In progress" },
  { key: "ready", label: "Ready" },
  { key: "failed", label: "Failed" },
];

function toStage(kind: Kind, status: string): Stage {
  if (status === "completed") return "ready";
  if (status === "failed" || status === "rejected") return "failed";
  if (kind === "ad") {
    return ["processing", "script_generating", "video_generating", "video_processing"].includes(status) ? "production" : "awaiting";
  }
  return status === "processing" ? "production" : "awaiting";
}

const fmt = (iso: string) => {
  try { return format(new Date(iso), "d MMM yyyy"); } catch { return ""; }
};

/** The video's address: a fresh signed link for files kept in storage, otherwise the stored link. */
async function resolveVideoUrl(item: Item): Promise<string | null> {
  if (item.fileKey) {
    try {
      const { data, error } = await supabase.functions.invoke("b2-get-signed-url", { body: { fileKey: item.fileKey } });
      const url = (data as any)?.signedUrl ?? (data as any)?.url;
      if (!error && url) return url;
    } catch {
      // fall back to the stored link
    }
  }
  return item.videoUrl;
}

function OrderCard({ item, kind, accent }: { item: Item; kind: Kind; accent: string }) {
  const [playing, setPlaying] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const st = STAGE[item.stage];

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    resolveVideoUrl(item).then((u) => {
      if (cancelled) return;
      if (u) setUri(u); else setFailed(true);
    });
    return () => { cancelled = true; };
  }, [playing, item]);

  return (
    <div className="rounded-2xl border bg-card p-3 space-y-3">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={item.stage !== "ready"}
          onClick={() => setPlaying((p) => !p)}
          aria-label={item.stage === "ready" ? "Watch video" : "Video not ready"}
          className="relative w-24 h-32 shrink-0 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center"
        >
          {item.thumb ? <img src={item.thumb} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" /> : null}
          <span className="absolute inset-0 bg-black/30" />
          <span className="relative text-white">
            {item.stage === "ready" ? <Play className="w-6 h-6" /> : kind === "ad" ? <Video className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </span>
        </button>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-bold line-clamp-2">{item.title}</p>
          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
          <p className="text-xs text-muted-foreground">{fmt(item.createdAt)} · {item.ratio}</p>
          <div className="flex items-center gap-2.5 pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: st.color, backgroundColor: `${st.color}1F` }}>
              <st.Icon className={cn("w-3 h-3", item.stage === "production" && "animate-spin")} />
              {st.label}
            </span>
            {item.price > 0 && <span className="text-sm font-bold" style={{ color: accent }}>₹{item.price.toLocaleString("en-IN")}</span>}
          </div>
          <p className="text-[10px] text-muted-foreground">#{item.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {item.stage === "failed" && item.note ? <p className="text-xs text-destructive">{item.note}</p> : null}

      {item.stage === "ready" && (
        playing ? (
          uri ? (
            <video src={uri} controls autoPlay playsInline className="w-full max-h-[420px] rounded-xl bg-black" style={{ aspectRatio: item.ratio.replace(":", "/") }} />
          ) : failed ? (
            <p className="text-xs text-destructive">Could not load this video. Please try again.</p>
          ) : (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: accent }} /></div>
          )
        ) : (
          <Button type="button" variant="outline" className="w-full rounded-xl" style={{ borderColor: accent, color: accent }} onClick={() => { setFailed(false); setPlaying(true); }}>
            <Play className="w-4 h-4 mr-2" /> Watch video
          </Button>
        )
      )}
    </div>
  );
}

export function UgcHistory({
  kind, accent, gradient, authUid, profileId, refreshKey, onCreate,
}: {
  kind: Kind;
  accent: string;
  gradient: readonly [string, string];
  authUid: string;
  profileId: string;
  refreshKey: number;
  onCreate: () => void;
}) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async (isRefresh = false) => {
    if (kind === "ad" ? !authUid : !profileId) return;
    if (isRefresh) setRefreshing(true);
    try {
      if (kind === "ad") {
        const { data, error: err } = await supabase
          .from("ugc_ads")
          .select("id, product_name, aspect_ratio, status, price_paid, video_url, video_file_key, created_at, generation_error, celebrities(name, image_url)")
          .eq("user_id", authUid)
          .order("created_at", { ascending: false })
          .limit(30);
        if (err) throw err;
        setItems((data as any[]).map((r): Item => ({
          id: r.id,
          title: r.product_name,
          subtitle: r.celebrities?.name ? `With ${r.celebrities.name}` : "UGC ad",
          stage: toStage("ad", r.status),
          price: Math.round(Number(r.price_paid) || 0),
          createdAt: r.created_at,
          ratio: r.aspect_ratio || "9:16",
          videoUrl: r.video_url,
          fileKey: r.video_file_key,
          thumb: r.celebrities?.image_url ?? null,
          note: r.generation_error,
        })));
      } else {
        const { data, error: err } = await (supabase as any)
          .from("wish_friend_orders")
          .select("id, recipient_name, occasion, aspect_ratio, status, price_paid, video_url, video_file_key, admin_notes, created_at, celebrities:celebrity_id(name, image_url)")
          .eq("user_id", profileId)
          .eq("order_type", "ugc_video")
          .order("created_at", { ascending: false })
          .limit(30);
        if (err) throw err;
        setItems((data as any[]).map((r): Item => ({
          id: r.id,
          title: `${r.occasion} video for ${r.recipient_name}`,
          subtitle: r.celebrities?.name ? `With ${r.celebrities.name}` : "UGC video",
          stage: toStage("video", r.status),
          price: r.price_paid || 0,
          createdAt: r.created_at,
          ratio: r.aspect_ratio || "9:16",
          videoUrl: r.video_url,
          fileKey: r.video_file_key,
          thumb: r.celebrities?.image_url ?? null,
          note: r.admin_notes,
        })));
      }
      setError(false);
    } catch (e) {
      console.warn("[ugc] history load failed", e);
      setError(true);
      setItems((prev) => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [kind, authUid, profileId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  if (items === null) {
    return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} /></div>;
  }

  const visible = items.filter((i) => {
    if (filter === "all") return true;
    if (filter === "progress") return i.stage === "awaiting" || i.stage === "production";
    return i.stage === filter;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn("h-8 px-3 rounded-full border text-xs font-semibold", on ? "text-white" : "bg-card")}
              style={on ? { backgroundColor: accent, borderColor: accent } : undefined}
            >
              {f.label}
            </button>
          );
        })}
        <button type="button" onClick={() => void load(true)} disabled={refreshing} aria-label="Refresh" className="ml-auto text-muted-foreground">
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {error && items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Could not load your orders. Use refresh to try again.</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-10">
          <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}>
            <Video className="w-7 h-7" />
          </div>
          <p className="text-base font-bold">{items.length === 0 ? "No orders yet" : "Nothing here"}</p>
          <p className="text-sm text-muted-foreground text-center">{items.length === 0 ? "Your video requests will show up here." : "Try another filter."}</p>
          {items.length === 0 && (
            <Button onClick={onCreate} className="rounded-full text-white" style={{ backgroundColor: accent }}>Create your first order</Button>
          )}
        </div>
      ) : (
        visible.map((item) => <OrderCard key={item.id} item={item} kind={kind} accent={accent} />)
      )}
    </div>
  );
}
