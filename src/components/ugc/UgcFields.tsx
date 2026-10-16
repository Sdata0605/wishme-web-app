import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SubscribedCelebrityChips } from "@/components/celebrity/SubscribedCelebrityChips";
import { useSubscribedCelebrities } from "@/hooks/useSubscribedCelebrities";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CelebrityLite, FieldDef, Option } from "@/lib/ugc/types";

const COLLAPSE_AFTER = 8;
const MAX_SIDE = 1600;

/** Shrinks a phone or camera photo before it is uploaded: a few hundred KB instead of several MB. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return blob ?? file;
  } catch {
    return file;
  }
}

function Chips({
  options, value, onChange, multi, max, invalid,
}: {
  options: Option[];
  value: any;
  onChange: (v: any) => void;
  multi?: boolean;
  max?: number;
  invalid?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = options.length > COLLAPSE_AFTER + 1;
  const list = !expanded && hasMore ? options.slice(0, COLLAPSE_AFTER) : options;
  const selected: string[] = multi ? (Array.isArray(value) ? value : []) : value ? [value] : [];

  const toggle = (v: string) => {
    if (!multi) { onChange(selected[0] === v ? "" : v); return; }
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else if (!max || selected.length < max) onChange([...selected, v]);
  };

  return (
    <div className={cn("flex flex-wrap gap-2 rounded-xl", invalid && "ring-2 ring-destructive/60 p-2")} role={multi ? "group" : "radiogroup"}>
      {list.map((o) => {
        const on = selected.includes(o.value);
        const locked = !!multi && !on && !!max && selected.length >= max;
        return (
          <button
            key={o.value}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={on}
            disabled={locked}
            onClick={() => toggle(o.value)}
            className={cn(
              "h-9 px-3.5 rounded-full border text-sm font-medium transition-colors inline-flex items-center gap-1.5",
              on
                ? "border-[var(--ugc-accent)] text-[var(--ugc-accent)] bg-[var(--ugc-accent-soft)]"
                : "bg-card border-border hover:border-foreground/30",
              locked && "opacity-50 cursor-not-allowed",
            )}
          >
            {multi && on ? <Check className="w-3" /> : null}
            {o.label}
          </button>
        );
      })}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="h-9 px-3.5 rounded-full border border-dashed border-border text-sm text-muted-foreground"
        >
          {expanded ? "Less" : `+ ${options.length - COLLAPSE_AFTER} more`}
        </button>
      )}
    </div>
  );
}

function ImageTiles({
  urls, max, onChange, uid, coverBadge, invalid,
}: { urls: string[]; max: number; onChange: (v: string[]) => void; uid: string; coverBadge?: boolean; invalid?: boolean }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(0);

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0 || !uid) return;
    const room = max - urls.length;
    const chosen = Array.from(files).slice(0, room);
    setUploading(chosen.length);
    const added: string[] = [];
    for (const file of chosen) {
      try {
        if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
        const body = await shrink(file);
        const path = `${uid}/ugc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error } = await supabase.storage.from("promotional-content").upload(path, body, { contentType: "image/jpeg", cacheControl: "3600" });
        if (error) throw error;
        added.push(supabase.storage.from("promotional-content").getPublicUrl(path).data.publicUrl);
      } catch (e: any) {
        toast({ title: "Photo upload failed", description: e?.message ?? "Please try again.", variant: "destructive" });
      }
      setUploading((n) => Math.max(0, n - 1));
    }
    setUploading(0);
    if (added.length) onChange([...urls, ...added]);
  };

  return (
    <div className="flex flex-wrap gap-2.5">
      {urls.map((u, i) => (
        <div key={u} className="relative w-20 h-20 rounded-xl overflow-hidden border bg-muted">
          <img src={u} alt="Uploaded" className="w-full h-full object-cover" loading="lazy" />
          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => onChange(urls.filter((x) => x !== u))}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
          {coverBadge && max > 1 && i === 0 && (
            <span className="absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white bg-[var(--ugc-accent)]">Cover</span>
          )}
        </div>
      ))}
      {urls.length < max && (
        <label
          className={cn(
            "w-20 h-20 rounded-xl border-[1.5px] border-dashed flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:border-foreground/40",
            invalid && "border-destructive",
          )}
        >
          <input type="file" accept="image/*" multiple={max - urls.length > 1} className="sr-only" onChange={(e) => { void pick(e.target.files); e.target.value = ""; }} />
          {uploading > 0 ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <Plus className="w-5 h-5" />
              <span className="text-[11px]">{urls.length}/{max}</span>
            </>
          )}
        </label>
      )}
    </div>
  );
}

/** One form field, drawn the way the mobile app draws it. */
export function UgcField({
  field, value, onChange, invalid, uid, celebrityPrice,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
  invalid: boolean;
  uid: string;
  /** What the user would pay for this celebrity, or null when they do not offer it. */
  celebrityPrice?: (c: CelebrityLite) => number | null;
}) {
  const subscribed = useSubscribedCelebrities<CelebrityLite>("id, name, category, image_url, service_prices");
  const helperId = `${field.key}-help`;
  const helper = invalid ? `${field.label} is required. ${field.helper ?? ""}`.trim() : field.helper;

  return (
    <div className="space-y-2" data-field={field.key}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`f-${field.key}`} className="text-sm font-semibold">
          {field.label}{field.required ? <span className="text-destructive"> *</span> : null}
        </Label>
        {field.type === "toggle" && (
          <Switch
            id={`f-${field.key}`}
            checked={!!value}
            onCheckedChange={onChange}
            className="data-[state=checked]:bg-[var(--ugc-accent)]"
          />
        )}
      </div>

      {(field.type === "text" || field.type === "link") && (
        <Input
          id={`f-${field.key}`}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          type={field.type === "link" ? "url" : "text"}
          inputMode={field.type === "link" ? "url" : undefined}
          aria-invalid={invalid}
          aria-describedby={helper ? helperId : undefined}
          className={cn("h-11 rounded-xl bg-card", invalid && "border-destructive focus-visible:ring-destructive")}
        />
      )}

      {field.type === "multiline" && (
        <>
          <Textarea
            id={`f-${field.key}`}
            value={value ?? ""}
            onChange={(e) => onChange(field.maxLength ? e.target.value.slice(0, field.maxLength) : e.target.value)}
            placeholder={field.placeholder}
            aria-invalid={invalid}
            aria-describedby={helper ? helperId : undefined}
            className={cn("min-h-24 rounded-xl bg-card", invalid && "border-destructive focus-visible:ring-destructive")}
          />
          {field.maxLength ? (
            <p className={cn("text-right text-[11px]", (value ?? "").length >= field.maxLength ? "text-destructive" : "text-muted-foreground")}>
              {(value ?? "").length} / {field.maxLength}
            </p>
          ) : null}
        </>
      )}

      {field.type === "chips" && <Chips options={field.options} value={value} onChange={onChange} invalid={invalid} />}
      {field.type === "chipsMulti" && <Chips options={field.options} value={value} onChange={onChange} multi max={field.max} invalid={invalid} />}

      {field.type === "images" && (
        <ImageTiles urls={Array.isArray(value) ? value : []} max={field.max} onChange={onChange} uid={uid} coverBadge={field.coverBadge} invalid={invalid} />
      )}

      {field.type === "celebrity" && (
        <SubscribedCelebrityChips<CelebrityLite>
          celebrities={subscribed.celebrities}
          loading={subscribed.loading}
          hasNone={subscribed.hasNone}
          selectedId={(value as CelebrityLite | null)?.id}
          onSelect={(c) => onChange(c)}
          priceFor={celebrityPrice}
          emptyText="Subscribe to a celebrity to choose them for this order."
        />
      )}

      {helper ? <p id={helperId} className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>{helper}</p> : null}
    </div>
  );
}
