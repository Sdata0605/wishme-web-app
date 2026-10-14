import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Bot, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mic, ShieldCheck, Sparkles, XCircle, Zap,
} from "lucide-react";

type Provider = "gemini" | "sarvam";

interface KeyInfo {
  configured: boolean;
  source: "database" | "server" | "none";
  last4: string | null;
  updatedAt: string | null;
}

interface Status {
  engine: Provider;
  fallback: boolean;
  changedAt: string | null;
  keys: Record<Provider, KeyInfo>;
}

interface TestResult {
  ok: boolean;
  detail: string;
  ms?: number;
}

const ENGINES: Record<Provider, { name: string; icon: typeof Bot; tagline: string; points: string[]; keyUrl: string }> = {
  gemini: {
    name: "Google Gemini Live",
    icon: Sparkles,
    tagline: "One real-time voice model that listens and speaks.",
    points: ["Always-on connection, instant start", "Natural voice with interruptions", "Voices are Google's built-in set"],
    keyUrl: "https://aistudio.google.com/apikey",
  },
  sarvam: {
    name: "Sarvam AI",
    icon: Mic,
    tagline: "India-hosted speech-to-text, language model and voice.",
    points: ["Built for Hindi, Hinglish and 11 Indian languages", "Streaming speech, tools and interruptions", "Connects when the user taps (not always-on)"],
    keyUrl: "https://dashboard.sarvam.ai",
  },
};

/** Calls the admin-only edge function and turns failures into readable messages. */
async function callAdmin<T = unknown>(body: Record<string, unknown>): Promise<{ data?: T; error?: string; canForce?: boolean }> {
  const { data, error } = await supabase.functions.invoke("ai-assistant-admin", { body });
  if (!error) return { data: data as T };
  let message = "Something went wrong. Please try again.";
  let canForce = false;
  try {
    const res = (error as { context?: Response }).context;
    if (res) {
      const j = await res.json();
      if (j?.error) message = String(j.error);
      canForce = !!j?.canForce;
    }
  } catch { /* keep the generic message */ }
  return { error: message, canForce };
}

const sourceLabel = (k: KeyInfo) =>
  !k.configured ? "No key set"
    : k.source === "database" ? `Set from this panel · ends in ${k.last4}`
    : `Using the server secret · ends in ${k.last4}`;

export default function AdminAIAssistant() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [engine, setEngine] = useState<Provider>("gemini");
  const [fallback, setFallback] = useState(true);
  const [savingEngine, setSavingEngine] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await callAdmin<Status>({ action: "status" });
    if (error || !data) {
      setLoadError(error ?? "Could not load the assistant settings.");
      return;
    }
    setStatus(data);
    setEngine(data.engine);
    setFallback(data.fallback);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const engineChanged = !!status && (engine !== status.engine || fallback !== status.fallback);

  const saveEngine = async () => {
    setSavingEngine(true);
    const { data, error } = await callAdmin<Status>({ action: "set_engine", engine, fallback });
    setSavingEngine(false);
    if (error || !data) {
      toast({ title: "Not changed", description: error, variant: "destructive" });
      return;
    }
    setStatus(data);
    setEngine(data.engine);
    setFallback(data.fallback);
    toast({ title: "Voice engine updated", description: `${ENGINES[data.engine].name} is now active. It applies the next time a user opens the assistant.` });
  };

  if (!status && !loadError) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading assistant settings…
      </div>
    );
  }

  if (loadError || !status) {
    return (
      <Card className="max-w-xl">
        <CardContent className="space-y-3 pt-6">
          <p className="flex items-center gap-2 font-medium text-destructive"><XCircle className="h-5 w-5" /> {loadError}</p>
          <Button variant="outline" onClick={() => void load()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold"><Bot className="h-6 w-6 text-primary" /> AI Assistant</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which AI powers the voice assistant in the app, and manage the API keys it uses.
        </p>
      </div>

      {/* ── Engine ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Zap className="h-5 w-5 text-primary" /> Voice engine</CardTitle>
          <CardDescription>
            Active now: <strong>{ENGINES[status.engine].name}</strong>
            {status.changedAt ? ` · changed ${new Date(status.changedAt).toLocaleString()}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2" role="radiogroup" aria-label="Voice engine">
            {(Object.keys(ENGINES) as Provider[]).map((p) => {
              const e = ENGINES[p];
              const selected = engine === p;
              const hasKey = status.keys[p].configured;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setEngine(p)}
                  className={`rounded-xl border-2 p-4 text-left transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold"><e.icon className="h-5 w-5 text-primary" />{e.name}</span>
                    <span className="flex items-center gap-1.5">
                      {status.engine === p && <Badge>Active</Badge>}
                      {hasKey ? <Badge variant="secondary">Key set</Badge> : <Badge variant="destructive">No key</Badge>}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{e.tagline}</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {e.points.map((pt) => <li key={pt}>{pt}</li>)}
                  </ul>
                  {!hasKey && <p className="mt-2 text-xs font-medium text-destructive">Add an API key below before switching to this engine.</p>}
                </button>
              );
            })}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Fall back to the other engine</p>
              <p className="text-xs text-muted-foreground">If the active engine can't start, the app quietly uses the other one (when it has a key).</p>
            </div>
            <Switch checked={fallback} onCheckedChange={setFallback} aria-label="Fall back to the other engine" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Applies the next time a user opens the assistant. App versions that don't know Sarvam yet keep using Gemini.
            </p>
            <Button onClick={() => void saveEngine()} disabled={!engineChanged || savingEngine}>
              {savingEngine && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save engine
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Keys ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5 text-primary" /> API keys</CardTitle>
          <CardDescription className="flex items-start gap-1.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Keys are stored encrypted on the server and are never shown again in full. New keys are tested before they are saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(Object.keys(ENGINES) as Provider[]).map((p) => (
            <KeyEditor key={p} provider={p} info={status.keys[p]} active={status.engine === p} onChanged={(s) => { setStatus(s); }} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function KeyEditor({ provider, info, active, onChanged }: { provider: Provider; info: KeyInfo; active: boolean; onChanged: (s: Status) => void }) {
  const e = ENGINES[provider];
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<null | "test" | "save" | "remove">(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [canForce, setCanForce] = useState(false);

  const test = async () => {
    setBusy("test");
    setResult(null);
    const { data, error } = await callAdmin<TestResult>({ action: "test_key", provider, value: value.trim() || undefined });
    setBusy(null);
    setResult(error || !data ? { ok: false, detail: error ?? "Could not run the test." } : data);
  };

  const save = async (force = false) => {
    setBusy("save");
    setResult(null);
    const { data, error, canForce: cf } = await callAdmin<Status>({ action: "set_key", provider, value: value.trim(), force });
    setBusy(null);
    if (error || !data) {
      setResult({ ok: false, detail: error ?? "Could not save the key." });
      setCanForce(!!cf);
      return;
    }
    setCanForce(false);
    setValue("");
    setShow(false);
    onChanged(data);
    setResult({ ok: true, detail: "Key saved. It is used from the next conversation." });
    toast({ title: `${e.name} key saved` });
  };

  const remove = async () => {
    setBusy("remove");
    setResult(null);
    const { data, error } = await callAdmin<Status>({ action: "clear_key", provider });
    setBusy(null);
    if (error || !data) {
      setResult({ ok: false, detail: error ?? "Could not remove the key." });
      return;
    }
    onChanged(data);
    setResult({ ok: true, detail: data.keys[provider].configured ? "Removed. The server's own key is used again." : "Key removed." });
  };

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <e.icon className="h-5 w-5 text-primary" /> {e.name}
          {active && <Badge>Active engine</Badge>}
        </div>
        <span className={`flex items-center gap-1.5 text-sm ${info.configured ? "text-emerald-600" : "text-destructive"}`}>
          {info.configured ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {sourceLabel(info)}
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            value={value}
            onChange={(ev) => { setValue(ev.target.value); setResult(null); setCanForce(false); }}
            placeholder={info.configured ? "Paste a new key to replace it" : "Paste the API key"}
            autoComplete="off"
            spellCheck={false}
            className="pr-10 font-mono text-sm"
            aria-label={`${e.name} API key`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Hide key" : "Show key"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button variant="outline" onClick={() => void test()} disabled={busy !== null || (!value.trim() && !info.configured)}>
          {busy === "test" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Test
        </Button>
        <Button onClick={() => void save()} disabled={busy !== null || value.trim().length < 8}>
          {busy === "save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save key
        </Button>
      </div>

      {result && (
        <p className={`flex items-start gap-1.5 text-sm ${result.ok ? "text-emerald-600" : "text-destructive"}`}>
          {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{result.detail}{result.ok && result.ms ? ` (${result.ms} ms)` : ""}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Get a key at <a href={e.keyUrl} target="_blank" rel="noreferrer" className="text-primary underline">{e.keyUrl.replace("https://", "")}</a>
          {info.updatedAt ? ` · last changed ${new Date(info.updatedAt).toLocaleString()}` : ""}
        </span>
        <span className="flex gap-2">
          {canForce && <Button size="sm" variant="outline" onClick={() => void save(true)} disabled={busy !== null}>Save anyway</Button>}
          {info.source === "database" && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void remove()} disabled={busy !== null}>
              {busy === "remove" && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Remove stored key
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
