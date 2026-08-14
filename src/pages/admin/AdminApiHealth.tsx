import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Activity, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock,
  Loader2, Video, Mic, CreditCard, Mail, MessageSquare, Phone,
  HardDrive, Brain, Music, Sparkles, Shield, Zap, WifiOff
} from "lucide-react";

// ─── SERVICE DEFINITIONS ──────────────────────────────────────────

interface ServiceDef {
  id: string;
  name: string;
  envKey: string;
  icon: typeof Activity;
  category: "ai" | "payment" | "communication" | "storage";
  description: string;
}

const SERVICES: ServiceDef[] = [
  { id: "heygen", name: "HeyGen", envKey: "HEYGEN_API_KEY", icon: Video, category: "ai", description: "AI video generation & avatar creation" },
  { id: "elevenlabs", name: "ElevenLabs", envKey: "ELEVENLABS_API_KEY", icon: Mic, category: "ai", description: "Voice cloning, TTS & music generation" },
  { id: "openrouter", name: "OpenRouter", envKey: "OPENROUTER_API_KEY", icon: Sparkles, category: "ai", description: "Text, lyrics, scripts & image generation" },
  { id: "gemini", name: "Google Gemini", envKey: "GOOGLE_GEMINI_API_KEY", icon: Brain, category: "ai", description: "Legacy Gemini direct key (now routed via OpenRouter)" },
  { id: "openai", name: "OpenAI", envKey: "OPENAI_API_KEY", icon: Sparkles, category: "ai", description: "Realtime audio & fallback AI" },
  { id: "vapi", name: "Vapi.ai", envKey: "VAPI_API_KEY", icon: Phone, category: "ai", description: "AI-powered celebrity voice calls" },
  { id: "music", name: "Music API", envKey: "MUSIC_API_KEY", icon: Music, category: "ai", description: "Alternative AI music generation" },
  { id: "suno", name: "Suno", envKey: "SUNO_API_KEY", icon: Music, category: "ai", description: "AI music generation with personas" },
  { id: "razorpay_id", name: "Razorpay Key", envKey: "RAZORPAY_KEY_ID", icon: CreditCard, category: "payment", description: "Payment gateway — publishable key" },
  { id: "razorpay_secret", name: "Razorpay Secret", envKey: "RAZORPAY_KEY_SECRET", icon: CreditCard, category: "payment", description: "Payment gateway — secret key" },
  { id: "resend", name: "Resend", envKey: "RESEND_API_KEY", icon: Mail, category: "communication", description: "Transactional & marketing emails" },
  { id: "whatsapp", name: "WhatsApp", envKey: "WHATSAPP_ACCESS_TOKEN", icon: MessageSquare, category: "communication", description: "WhatsApp Business notifications" },
  { id: "b2", name: "Backblaze B2", envKey: "B2_APPLICATION_KEY", icon: HardDrive, category: "storage", description: "Media file storage (videos, images, audio)" },
];

const CATEGORY_META: Record<string, { label: string; icon: typeof Activity; color: string }> = {
  ai: { label: "AI & Generation", icon: Brain, color: "text-violet-500" },
  payment: { label: "Payments", icon: CreditCard, color: "text-emerald-500" },
  communication: { label: "Communication", icon: Mail, color: "text-blue-500" },
  storage: { label: "Storage", icon: HardDrive, color: "text-amber-500" },
};

type ServiceStatus = {
  status: "configured" | "missing" | "error" | "testing" | "unknown";
  message: string;
  lastTested: string | null;
  responseTime?: number;
};

// Helper to persist cached statuses to platform_settings
const saveCachedStatuses = async (statuses: Record<string, ServiceStatus>, autoRefresh: boolean) => {
  try {
    const rows = [
      { setting_key: "api_health_cached_results", setting_value: JSON.stringify(statuses) },
      { setting_key: "api_health_auto_refresh_enabled", setting_value: String(autoRefresh) },
    ];
    for (const row of rows) {
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("setting_key", row.setting_key)
        .maybeSingle();
      if (existing) {
        await supabase.from("platform_settings").update({ setting_value: row.setting_value }).eq("setting_key", row.setting_key);
      } else {
        await supabase.from("platform_settings").insert(row);
      }
    }
  } catch {
    // silent
  }
};

export default function AdminApiHealth() {
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({});
  const [testing, setTesting] = useState(false);
  const [testingSingle, setTestingSingle] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ─── LOAD CACHED RESULTS ON MOUNT ─────────────────────────────────

  useEffect(() => {
    const loadCached = async () => {
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["api_health_cached_results", "api_health_auto_refresh_enabled"]);

        if (data) {
          for (const row of data) {
            if (row.setting_key === "api_health_cached_results") {
              try {
                const cached = JSON.parse(row.setting_value);
                setStatuses(cached);
                // Find the most recent lastTested timestamp
                const timestamps = Object.values(cached as Record<string, ServiceStatus>)
                  .map(s => s.lastTested)
                  .filter(Boolean) as string[];
                if (timestamps.length > 0) {
                  setLastFullCheck(timestamps.sort().reverse()[0]);
                }
              } catch { /* invalid json */ }
            }
            if (row.setting_key === "api_health_auto_refresh_enabled") {
              setAutoRefresh(row.setting_value === "true");
            }
          }
        }
      } catch {
        // silent
      } finally {
        setLoaded(true);
      }
    };
    loadCached();
  }, []);

  // ─── TEST ALL ──────────────────────────────────────────────────────

  const testAll = useCallback(async () => {
    setTesting(true);
    const testingState: Record<string, ServiceStatus> = {};
    SERVICES.forEach(s => {
      testingState[s.id] = { status: "testing", message: "Testing...", lastTested: null };
    });
    setStatuses(testingState);

    try {
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke("test-api-connections", {
        body: {},
      });
      const elapsed = Date.now() - startTime;

      if (error) throw error;

      const results: Record<string, ServiceStatus> = {};
      const apiResults = data?.results || [];

      for (const service of SERVICES) {
        const match = apiResults.find((r: any) => r.name === service.envKey);
        if (match) {
          results[service.id] = {
            status: match.status,
            message: match.message,
            lastTested: match.lastTested || new Date().toISOString(),
            responseTime: Math.round(elapsed / apiResults.length),
          };
        } else {
          results[service.id] = { status: "unknown", message: "Not tested", lastTested: null };
        }
      }

      setStatuses(results);
      const now = new Date().toISOString();
      setLastFullCheck(now);

      // Cache results
      saveCachedStatuses(results, autoRefresh);

      toast({ title: "Health Check Complete", description: `Tested ${SERVICES.length} services in ${elapsed}ms` });
    } catch (err: any) {
      console.error("Health check failed:", err);
      toast({ title: "Health Check Failed", description: err.message || "Could not reach API test endpoint", variant: "destructive" });
      const unknownState: Record<string, ServiceStatus> = {};
      SERVICES.forEach(s => {
        unknownState[s.id] = { status: "unknown", message: "Check failed", lastTested: null };
      });
      setStatuses(unknownState);
    } finally {
      setTesting(false);
    }
  }, [autoRefresh]);

  // ─── TEST SINGLE ────────────────────────────────────────────────────

  const testSingle = async (service: ServiceDef) => {
    setTestingSingle(service.id);
    setStatuses(prev => ({
      ...prev,
      [service.id]: { status: "testing", message: "Testing...", lastTested: prev[service.id]?.lastTested || null },
    }));

    try {
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke("test-api-connections", {
        body: { testKey: service.envKey },
      });
      const elapsed = Date.now() - startTime;

      if (error) throw error;

      const match = data?.results?.find((r: any) => r.name === service.envKey);
      if (match) {
        setStatuses(prev => {
          const updated = {
            ...prev,
            [service.id]: {
              status: match.status,
              message: match.message,
              lastTested: match.lastTested || new Date().toISOString(),
              responseTime: elapsed,
            },
          };
          saveCachedStatuses(updated, autoRefresh);
          return updated;
        });
      }
    } catch (err: any) {
      setStatuses(prev => {
        const updated = {
          ...prev,
          [service.id]: { status: "error" as const, message: err.message || "Test failed", lastTested: new Date().toISOString() },
        };
        saveCachedStatuses(updated, autoRefresh);
        return updated;
      });
    } finally {
      setTestingSingle(null);
    }
  };

  // ─── AUTO REFRESH (only when toggle is ON) ────────────────────────

  const handleAutoRefreshToggle = useCallback((enabled: boolean) => {
    setAutoRefresh(enabled);
    // Persist toggle state
    saveCachedStatuses(statuses, enabled);
    if (enabled) {
      // Test immediately when enabling auto-refresh
      testAll();
    }
  }, [statuses, testAll]);

  useEffect(() => {
    if (!autoRefresh || !loaded) return;
    const interval = setInterval(testAll, 5 * 60_000); // 5 minutes
    return () => clearInterval(interval);
  }, [autoRefresh, loaded, testAll]);

  // ─── STATS ─────────────────────────────────────────────────────────

  const total = SERVICES.length;
  const hasData = Object.keys(statuses).length > 0;
  const healthy = Object.values(statuses).filter(s => s.status === "configured").length;
  const errors = Object.values(statuses).filter(s => s.status === "error").length;
  const missing = Object.values(statuses).filter(s => s.status === "missing").length;
  const healthPercent = total > 0 && hasData ? Math.round((healthy / total) * 100) : 0;

  const statusIcon = (status: string) => {
    switch (status) {
      case "configured": return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "missing": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "error": return <XCircle className="h-5 w-5 text-destructive" />;
      case "testing": return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      default: return <WifiOff className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "configured": return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">Healthy</Badge>;
      case "missing": return <Badge variant="outline" className="text-amber-600 border-amber-500/30">Not Configured</Badge>;
      case "error": return <Badge variant="destructive">Error</Badge>;
      case "testing": return <Badge variant="secondary">Testing...</Badge>;
      default: return <Badge variant="secondary">Not Tested</Badge>;
    }
  };

  const getTimeAgo = (iso: string | null) => {
    if (!iso) return "Never tested";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const categories = ["ai", "payment", "communication", "storage"] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            API Health Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasData ? "Showing cached results from last test" : "Click 'Test All' to check API connectivity"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">Auto-refresh</span>
            <Switch checked={autoRefresh} onCheckedChange={handleAutoRefreshToggle} className="scale-75" />
          </div>
          <Button onClick={testAll} disabled={testing} size="sm">
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
            {testing ? "Testing..." : "Test All"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overall Health</p>
                <p className="text-2xl font-bold text-foreground">{hasData ? `${healthPercent}%` : "—"}</p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${!hasData ? "bg-muted" : healthPercent === 100 ? "bg-emerald-500/15" : healthPercent >= 70 ? "bg-amber-500/15" : "bg-destructive/15"}`}>
                {!hasData ? <WifiOff className="h-6 w-6 text-muted-foreground" /> : healthPercent === 100 ? <Shield className="h-6 w-6 text-emerald-500" /> : <Activity className="h-6 w-6 text-amber-500" />}
              </div>
            </div>
            <Progress value={healthPercent} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Healthy</p>
                <p className="text-2xl font-bold text-emerald-600">{hasData ? healthy : "—"}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500/40" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">of {total} services</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-destructive">{hasData ? errors : "—"}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive/40" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{!hasData ? "Run test first" : errors === 0 ? "All clear" : "Needs attention"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Not Configured</p>
                <p className="text-2xl font-bold text-amber-600">{hasData ? missing : "—"}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500/40" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{!hasData ? "Run test first" : missing === 0 ? "All set" : "Optional services"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Last checked */}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {lastFullCheck
          ? `Last full check: ${getTimeAgo(lastFullCheck)} (${new Date(lastFullCheck).toLocaleString()})`
          : "No tests run yet — click 'Test All' to check"
        }
        {autoRefresh && " · Auto-refreshing every 5 min"}
      </p>

      {/* Service Cards by Category */}
      {categories.map(cat => {
        const meta = CATEGORY_META[cat];
        const catServices = SERVICES.filter(s => s.category === cat);
        const CatIcon = meta.icon;

        return (
          <div key={cat} className="space-y-3">
            <h2 className={`text-sm font-semibold flex items-center gap-2 ${meta.color}`}>
              <CatIcon className="h-4 w-4" />
              {meta.label}
              <Badge variant="secondary" className="text-[10px] ml-1">{catServices.length}</Badge>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {catServices.map(service => {
                const st = statuses[service.id];
                const Icon = service.icon;
                const isTesting = testingSingle === service.id || (testing && st?.status === "testing");

                return (
                  <Card key={service.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-3 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{service.name}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight">{service.description}</p>
                          </div>
                        </div>
                        {st ? statusIcon(st.status) : <WifiOff className="h-5 w-5 text-muted-foreground/40" />}
                      </div>

                      <div className="flex items-center justify-between">
                        {st ? statusBadge(st.status) : <Badge variant="secondary">Not Tested</Badge>}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isTesting}
                          onClick={() => testSingle(service)}
                        >
                          {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                          Test
                        </Button>
                      </div>

                      {st?.message && st.status !== "testing" && (
                        <p className="text-[11px] text-muted-foreground truncate">{st.message}</p>
                      )}

                      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {st?.lastTested ? `Last tested: ${getTimeAgo(st.lastTested)}` : "Never tested"}
                        {st?.responseTime ? ` · ${st.responseTime}ms` : ""}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
