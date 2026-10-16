import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, Info, Loader2 } from "lucide-react";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  displayValue, isEmptyValue, missingRequired, visibleFields,
  type CelebrityLite, type FormConfig, type SectionDef, type Values,
} from "@/lib/ugc/types";
import { UgcField } from "./UgcFields";

interface Props {
  config: FormConfig;
  title: string;
  subtitle: string;
  icon: ReactNode;
  pills: string[];
  /** Price after discount for the current answers, or null if it depends on something not chosen yet. */
  getPrice: (values: Values) => number | null;
  walletBalance: number;
  onSubmit: (values: Values) => Promise<{ id: string }>;
  onPaid: () => void;
  celebrityPrice?: (c: CelebrityLite) => number | null;
  historySlot: (refreshKey: number, goToNew: () => void) => ReactNode;
  authUid: string;
  successTitle?: string;
  initialValues?: Values;
}

type Tab = "new" | "orders";
const TIMELINE = ["Received", "In production", "Delivered"];

export function UgcOrderPage({
  config, title, subtitle, icon, pills, getPrice, walletBalance, onSubmit, onPaid,
  celebrityPrice, historySlot, authUid, successTitle = "Order placed", initialValues,
}: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [grad0, grad1] = config.gradient;
  const gradient = `linear-gradient(135deg, ${grad0}, ${grad1})`;

  const [tab, setTab] = useState<Tab>("new");
  const [values, setValues] = useState<Values>({ ...config.defaults, ...initialValues });
  const [open, setOpen] = useState<Record<string, boolean>>({ [config.sections[0].key]: true });
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<{ id: string } | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const sectionEls = useRef<Record<string, HTMLDivElement | null>>({});
  const draftKey = `ugc-draft:${config.id}:${authUid}`;
  const loadedDraft = useRef(false);

  // Restore an unfinished order, and keep saving while the user types.
  useEffect(() => {
    if (!authUid) return;
    loadedDraft.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Values;
      setValues((prev) => ({ ...prev, ...saved, ...initialValues }));
      setDraftRestored(true);
    } catch {
      // ignore a corrupt draft
    }
    // initialValues is fixed for the life of the page; restoring again when it changes would undo the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, authUid]);

  // A celebrity chosen from their profile arrives after the page has opened.
  const presetKey = initialValues?.celebrity?.id as string | undefined;
  useEffect(() => {
    if (presetKey && initialValues) setValues((prev) => ({ ...prev, ...initialValues }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetKey]);

  useEffect(() => {
    if (!loadedDraft.current || placed) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(values)); } catch { /* storage full or blocked */ }
    }, 500);
    return () => clearTimeout(t);
  }, [values, draftKey, placed]);

  const set = useCallback((key: string, v: any) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setFlagged((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const price = getPrice(values);
  const missing = useMemo(() => missingRequired(config, values), [config, values]);
  const shortBy = price != null ? Math.max(0, price - walletBalance) : 0;

  const resetForm = () => {
    setValues({ ...config.defaults, ...initialValues });
    setFlagged(new Set());
    setDraftRestored(false);
  };

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    resetForm();
  };

  const goToSection = (key: string) => {
    setOpen((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => sectionEls.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const sectionSummary = (section: SectionDef) => {
    const fields = visibleFields(section, values);
    const left = missing.filter((m) => m.section.key === section.key).length;
    const answers = fields
      .filter((f) => f.type !== "toggle" && f.type !== "images" && !isEmptyValue(values[f.key]))
      .map((f) => displayValue(f, values[f.key]))
      .filter(Boolean);
    return { text: answers.slice(0, 3).join(" · "), complete: fields.some((f) => f.required) && left === 0, left };
  };

  const tryReview = () => {
    if (missing.length > 0) {
      setFlagged(new Set(missing.map((m) => m.field.key)));
      setOpen((prev) => {
        const next = { ...prev };
        for (const m of missing) next[m.section.key] = true;
        return next;
      });
      goToSection(missing[0].section.key);
      return;
    }
    if (shortBy > 0) {
      navigate("/wallet");
      return;
    }
    setReviewing(true);
  };

  const pay = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await onSubmit(values);
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      setReviewing(false);
      setPlaced(res);
      onPaid();
    } catch (e) {
      console.warn(`[ugc:${config.id}] order failed`, e);
      toast({ title: "Could not place order", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const startAnother = () => {
    resetForm();
    setOpen({ [config.sections[0].key]: true });
    setPlaced(null);
  };

  const viewOrders = () => { setRefreshKey((k) => k + 1); setTab("orders"); };

  const barLabel = missing.length === 0 && shortBy > 0 ? `Add ₹${shortBy.toLocaleString("en-IN")} & Pay` : "Review & Pay";

  return (
    <AuthenticatedLayout>
      <div
        className="max-w-2xl mx-auto pb-8"
        style={{ ["--ugc-accent" as any]: config.accent, ["--ugc-accent-soft" as any]: `${config.accent}1A` }}
      >
        <header className="relative overflow-hidden px-5 pt-6 pb-6 text-white md:rounded-b-[28px]" style={{ background: gradient }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-5 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] shrink-0 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">{icon}</div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">{title}</h1>
              <p className="text-[13px] text-white/90 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <div className="relative flex flex-wrap gap-1.5 mt-4">
            {pills.map((p) => <span key={p} className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold">{p}</span>)}
          </div>
        </header>

        <div role="tablist" className="flex m-4 p-1 rounded-2xl border bg-card">
          {(["new", "orders"] as Tab[]).map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => (t === "orders" ? viewOrders() : setTab(t))}
                className={cn("flex-1 h-10 rounded-xl text-sm font-semibold transition-colors", on ? "text-white" : "text-muted-foreground")}
                style={on ? { backgroundColor: config.accent } : undefined}
              >
                {t === "new" ? "New order" : "My orders"}
              </button>
            );
          })}
        </div>

        {tab === "orders" ? (
          <div className="px-4">{historySlot(refreshKey, () => setTab("new"))}</div>
        ) : placed ? (
          <div className="flex flex-col items-center gap-2.5 px-6 pt-5 text-center">
            <div className="w-[84px] h-[84px] rounded-full flex items-center justify-center text-white" style={{ background: gradient }}>
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold">{successTitle}</h2>
            <p className="text-sm text-muted-foreground">Order #{placed.id.slice(0, 8).toUpperCase()}</p>
            <div className="flex gap-5 my-2">
              {TIMELINE.map((step, i) => (
                <div key={step} className="flex flex-col items-center gap-1.5">
                  <div className={cn("w-[22px] h-[22px] rounded-full flex items-center justify-center", i === 0 ? "bg-green-500 text-white" : "bg-border")}>
                    {i === 0 && <Check className="w-3 h-3" />}
                  </div>
                  <span className={cn("text-[11px] font-medium", i !== 0 && "text-muted-foreground")}>{step}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Our team will make your video. You will find it under My orders.</p>
            <div className="w-full space-y-2.5 mt-2">
              <Button onClick={viewOrders} className="w-full h-12 rounded-full text-white font-bold" style={{ background: gradient }}>View my orders</Button>
              <Button onClick={startAnother} variant="outline" className="w-full h-12 rounded-full">Place another order</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 space-y-3">
              {draftRestored && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium" style={{ backgroundColor: `${config.accent}1A`, borderColor: `${config.accent}55` }}>
                  <Info className="w-4 h-4" style={{ color: config.accent }} />
                  <span className="flex-1">We restored your unfinished order.</span>
                  <button type="button" onClick={clearDraft} className="font-bold" style={{ color: config.accent }}>Start over</button>
                </div>
              )}

              {config.sections.map((section, idx) => {
                const isOpen = !!open[section.key];
                const sum = sectionSummary(section);
                return (
                  <div key={section.key} ref={(el) => { sectionEls.current[section.key] = el; }} className="rounded-2xl border bg-card overflow-hidden scroll-mt-20">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <span
                        className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", sum.complete && "bg-green-500 text-white")}
                        style={sum.complete ? undefined : { backgroundColor: `${config.accent}1F`, color: config.accent }}
                      >
                        {sum.complete ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-base font-semibold">{section.title}</span>
                        {!isOpen && (
                          <span className={cn("block text-xs mt-0.5 truncate", sum.left > 0 ? "text-destructive" : "text-muted-foreground")}>
                            {sum.left > 0 ? `${sum.left} required left` : sum.text || "Optional"}
                          </span>
                        )}
                      </span>
                      {isOpen ? <ChevronUp className="w-[18px] h-[18px] text-muted-foreground" /> : <ChevronDown className="w-[18px] h-[18px] text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-5 space-y-5">
                        {visibleFields(section, values).map((field) => (
                          <UgcField
                            key={field.key}
                            field={field}
                            value={values[field.key]}
                            onChange={(v) => set(field.key, v)}
                            invalid={flagged.has(field.key)}
                            uid={authUid}
                            celebrityPrice={celebrityPrice}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 mt-4 border-t bg-background/95 backdrop-blur px-4 pt-2 pb-3">
              {missing.length > 0 && (
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                  {missing.length} required {missing.length === 1 ? "field" : "fields"} left
                </p>
              )}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-lg font-bold leading-tight">{price != null ? `₹${price.toLocaleString("en-IN")}` : "—"}</p>
                  <p className={cn("text-xs", shortBy > 0 && missing.length === 0 ? "text-destructive" : "text-muted-foreground")}>
                    Wallet ₹{walletBalance.toLocaleString("en-IN")}
                  </p>
                </div>
                <Button onClick={tryReview} className="flex-1 h-[50px] rounded-full text-[15px] font-bold text-white" style={{ background: gradient }}>
                  {barLabel}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={reviewing} onOpenChange={(o) => { if (!submitting) setReviewing(o); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review your order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {config.sections.map((section) => {
              const rows = visibleFields(section, values).filter((f) => (f.type === "toggle" ? true : !isEmptyValue(values[f.key])));
              if (rows.length === 0) return null;
              return (
                <div key={section.key} className="rounded-xl border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold">{section.title}</p>
                    <button type="button" className="text-xs font-bold" style={{ color: config.accent }} onClick={() => { setReviewing(false); goToSection(section.key); }}>Edit</button>
                  </div>
                  {rows.map((f) => (
                    <div key={f.key} className="flex justify-between gap-3.5">
                      <span className="text-xs text-muted-foreground max-w-[45%] shrink-0">{f.label}</span>
                      <span className="text-[13px] font-medium text-right flex-1 break-words">{displayValue(f, values[f.key])}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="rounded-xl border bg-card p-3 space-y-2">
              <div className="flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold text-base" style={{ color: config.accent }}>₹{(price ?? 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Wallet after payment</span>
                <span className="text-[13px] font-medium">₹{Math.max(0, walletBalance - (price ?? 0)).toLocaleString("en-IN")}</span>
              </div>
            </div>
            <Button onClick={pay} disabled={submitting} className="w-full h-[50px] rounded-full text-[15px] font-bold text-white" style={{ background: gradient }}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ₹${(price ?? 0).toLocaleString("en-IN")} from wallet`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
