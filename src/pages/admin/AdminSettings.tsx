import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, Save, RefreshCw, Shield, Bell, Mail, Percent, 
  Music, Video, Key, CheckCircle, XCircle, Loader2, ExternalLink,
  Eye, EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyStatus {
  name: string;
  configured: boolean;
  maskedValue: string | null;
  status?: "configured" | "missing" | "error";
  message?: string;
  testing?: boolean;
}

export default function AdminSettings() {
  const { toast } = useToast();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  
  // TDS Settings
  const [tdsWithPan, setTdsWithPan] = useState("10");
  const [tdsWithoutPan, setTdsWithoutPan] = useState("20");
  
  // Music API Settings
  const [musicApiEnabled, setMusicApiEnabled] = useState(false);
  const [musicApiFreeLimit, setMusicApiFreeLimit] = useState("3");
  const [musicLyricsPrice, setMusicLyricsPrice] = useState("50");
  const [musicSongPrice, setMusicSongPrice] = useState("100");
  const [musicDownloadPrice, setMusicDownloadPrice] = useState("20");
  const [savingMusic, setSavingMusic] = useState(false);
  const [testingMusicApi, setTestingMusicApi] = useState(false);
  
  // Conversation Message Limits
  const [messageLimit, setMessageLimit] = useState("200");
  const [warningOffset, setWarningOffset] = useState("10");
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [savingMessages, setSavingMessages] = useState(false);
  
  // Platform Configuration
  const [siteName, setSiteName] = useState("Wish Me");
  const [supportEmail, setSupportEmail] = useState("support@wishme.today");
  const [platformDescription, setPlatformDescription] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  
  // Security Settings
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [enableTwoFactor, setEnableTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
  const [savingSecurity, setSavingSecurity] = useState(false);
  
  // Notification Settings
  const [newUserNotifications, setNewUserNotifications] = useState(true);
  const [newBookingNotifications, setNewBookingNotifications] = useState(true);
  const [celebrityApplications, setCelebrityApplications] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  
  // Email Configuration
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [emailFrom, setEmailFrom] = useState("noreply@wishme.today");
  const [emailFromName, setEmailFromName] = useState("Wish Me Team");
  const [savingEmail, setSavingEmail] = useState(false);
  
  // Greeting Card Settings
  const [greetingCardPrice, setGreetingCardPrice] = useState("2");
  
  
  // API Key Management
  const [apiKeys, setApiKeys] = useState<ApiKeyStatus[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState<string | null>(null);
  const [newApiKeyValue, setNewApiKeyValue] = useState("");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Fetch all settings on mount — do NOT auto-test APIs
  useEffect(() => {
    fetchAllSettings();
    // Load cached API status from platform_settings instead of calling edge function
    loadCachedApiStatus();
  }, []);

  const loadCachedApiStatus = async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "api_key_last_status")
        .maybeSingle();
      
      if (data?.setting_value) {
        try {
          const cached = JSON.parse(data.setting_value);
          if (Array.isArray(cached)) {
            setApiKeys(cached.map((r: any) => ({
              name: r.name,
              configured: r.status === "configured",
              maskedValue: null,
              status: r.status,
              message: r.message,
            })));
          }
        } catch { /* invalid JSON, ignore */ }
      }
    } catch (error) {
      console.error("Error loading cached API status:", error);
    }
  };

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*");

      if (error) throw error;

      data?.forEach((setting) => {
        switch (setting.setting_key) {
          // TDS
          case "tds_rate_with_pan": setTdsWithPan(setting.setting_value); break;
          case "tds_rate_without_pan": setTdsWithoutPan(setting.setting_value); break;
          // Music API
          case "music_api_enabled": setMusicApiEnabled(setting.setting_value === "true"); break;
          case "music_api_free_limit": setMusicApiFreeLimit(setting.setting_value); break;
          case "music_lyrics_generation_price": setMusicLyricsPrice(setting.setting_value); break;
          case "music_song_generation_price": setMusicSongPrice(setting.setting_value); break;
          case "music_download_price": setMusicDownloadPrice(setting.setting_value); break;
          // Messages
          case "conversation_message_limit": setMessageLimit(setting.setting_value); break;
          case "conversation_warning_offset": setWarningOffset(setting.setting_value); break;
          case "conversation_limit_enabled": setLimitEnabled(setting.setting_value === "true"); break;
          // Platform
          case "site_name": setSiteName(setting.setting_value); break;
          case "support_email": setSupportEmail(setting.setting_value); break;
          case "platform_description": setPlatformDescription(setting.setting_value); break;
          case "maintenance_mode": setMaintenanceMode(setting.setting_value === "true"); break;
          // Security
          case "require_email_verification": setRequireEmailVerification(setting.setting_value === "true"); break;
          case "enable_two_factor": setEnableTwoFactor(setting.setting_value === "true"); break;
          case "session_timeout": setSessionTimeout(setting.setting_value); break;
          case "max_login_attempts": setMaxLoginAttempts(setting.setting_value); break;
          // Notifications
          case "new_user_notifications": setNewUserNotifications(setting.setting_value === "true"); break;
          case "new_booking_notifications": setNewBookingNotifications(setting.setting_value === "true"); break;
          case "celebrity_applications_notifications": setCelebrityApplications(setting.setting_value === "true"); break;
          case "system_alerts": setSystemAlerts(setting.setting_value === "true"); break;
          // Email
          case "smtp_host": setSmtpHost(setting.setting_value); break;
          case "smtp_port": setSmtpPort(setting.setting_value); break;
          case "email_from": setEmailFrom(setting.setting_value); break;
          case "email_from_name": setEmailFromName(setting.setting_value); break;
          // Greeting Card
          case "greeting_card_price": setGreetingCardPrice(setting.setting_value); break;
        }
      });
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKeyStatus = async () => {
    setLoadingApiKeys(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-api-connections", {
        body: {},
      });

      if (error) throw error;

      if (data?.results) {
        const mapped = data.results.map((r: any) => ({
          name: r.name,
          configured: r.status === "configured",
          maskedValue: null,
          status: r.status,
          message: r.message,
        }));
        setApiKeys(mapped);
        
        // Cache results to platform_settings for next page load
        try {
          await supabase.from("platform_settings").upsert({
            setting_key: "api_key_last_status",
            setting_value: JSON.stringify(data.results),
          }, { onConflict: "setting_key" });
        } catch { /* ignore cache write errors */ }
      }
    } catch (error: any) {
      console.error("Error fetching API key status:", error);
    } finally {
      setLoadingApiKeys(false);
    }
  };

  // Generic upsert helper
  const upsertSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ setting_key: key, setting_value: value }, { onConflict: "setting_key" });
    if (error) throw error;
  };

  // Save handlers
  const savePlatformSettings = async () => {
    setSavingPlatform(true);
    try {
      await Promise.all([
        upsertSetting("site_name", siteName),
        upsertSetting("support_email", supportEmail),
        upsertSetting("platform_description", platformDescription),
        upsertSetting("maintenance_mode", maintenanceMode.toString()),
      ]);
      toast({ title: "Success", description: "Platform settings saved" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to save platform settings", variant: "destructive" });
    } finally {
      setSavingPlatform(false);
    }
  };

  const saveTdsSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        upsertSetting("tds_rate_with_pan", tdsWithPan),
        upsertSetting("tds_rate_without_pan", tdsWithoutPan),
      ]);
      toast({ title: "Success", description: "TDS settings updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: "Could not update TDS settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveMessageSettings = async () => {
    setSavingMessages(true);
    try {
      await Promise.all([
        upsertSetting("conversation_message_limit", messageLimit),
        upsertSetting("conversation_warning_offset", warningOffset),
        upsertSetting("conversation_limit_enabled", limitEnabled.toString()),
      ]);
      toast({ title: "Success", description: "Message limit settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: "Could not update message settings", variant: "destructive" });
    } finally {
      setSavingMessages(false);
    }
  };

  const saveMusicApiSettings = async () => {
    setSavingMusic(true);
    try {
      await Promise.all([
        upsertSetting("music_api_enabled", musicApiEnabled.toString()),
        upsertSetting("music_api_free_limit", musicApiFreeLimit),
        upsertSetting("music_lyrics_generation_price", musicLyricsPrice),
        upsertSetting("music_song_generation_price", musicSongPrice),
        upsertSetting("music_download_price", musicDownloadPrice),
      ]);
      toast({ title: "Success", description: "Music API settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: "Could not update Music API settings", variant: "destructive" });
    } finally {
      setSavingMusic(false);
    }
  };

  const saveSecuritySettings = async () => {
    setSavingSecurity(true);
    try {
      await Promise.all([
        upsertSetting("require_email_verification", requireEmailVerification.toString()),
        upsertSetting("enable_two_factor", enableTwoFactor.toString()),
        upsertSetting("session_timeout", sessionTimeout),
        upsertSetting("max_login_attempts", maxLoginAttempts),
      ]);
      toast({ title: "Success", description: "Security settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: "Could not update security settings", variant: "destructive" });
    } finally {
      setSavingSecurity(false);
    }
  };

  const saveNotificationSettings = async () => {
    setSavingNotifications(true);
    try {
      await Promise.all([
        upsertSetting("new_user_notifications", newUserNotifications.toString()),
        upsertSetting("new_booking_notifications", newBookingNotifications.toString()),
        upsertSetting("celebrity_applications_notifications", celebrityApplications.toString()),
        upsertSetting("system_alerts", systemAlerts.toString()),
      ]);
      toast({ title: "Success", description: "Notification settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: "Could not update notification settings", variant: "destructive" });
    } finally {
      setSavingNotifications(false);
    }
  };

  const saveEmailSettings = async () => {
    setSavingEmail(true);
    try {
      await Promise.all([
        upsertSetting("smtp_host", smtpHost),
        upsertSetting("smtp_port", smtpPort),
        upsertSetting("email_from", emailFrom),
        upsertSetting("email_from_name", emailFromName),
      ]);
      toast({ title: "Success", description: "Email settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: "Could not update email settings", variant: "destructive" });
    } finally {
      setSavingEmail(false);
    }
  };

  const saveAllSettings = async () => {
    setSavingAll(true);
    try {
      await Promise.all([
        savePlatformSettings(),
        saveTdsSettings(),
        saveMessageSettings(),
        saveMusicApiSettings(),
        saveSecuritySettings(),
        saveNotificationSettings(),
        saveEmailSettings(),
      ]);
      toast({ title: "Success", description: "All settings saved successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: "Some settings failed to save", variant: "destructive" });
    } finally {
      setSavingAll(false);
    }
  };

  const testMusicApiConnection = async () => {
    setTestingMusicApi(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lyrics", {
        body: { theme: "test", genre: "pop", mood: "happy", style: "modern" },
      });
      if (error) throw error;
      toast({ title: "Success", description: "Music API connection successful!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to connect to Music API", variant: "destructive" });
    } finally {
      setTestingMusicApi(false);
    }
  };

  const testApiConnection = async (keyName: string) => {
    setApiKeys((prev) => prev.map((k) => k.name === keyName ? { ...k, testing: true } : k));
    try {
      const { data, error } = await supabase.functions.invoke("test-api-connections", {
        body: { testKey: keyName },
      });
      if (error) throw error;
      
      const result = data?.results?.find((r: any) => r.name === keyName);
      if (result) {
        setApiKeys((prev) => prev.map((k) => 
          k.name === keyName 
            ? { ...k, status: result.status, message: result.message, testing: false }
            : k
        ));
        toast({ 
          title: result.status === "configured" ? "Success" : "Warning",
          description: result.message,
          variant: result.status === "error" ? "destructive" : "default"
        });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to test connection", variant: "destructive" });
    } finally {
      setApiKeys((prev) => prev.map((k) => k.name === keyName ? { ...k, testing: false } : k));
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">
            Configure platform settings and administrative preferences.
          </p>
        </div>
        <Button onClick={saveAllSettings} disabled={savingAll} size="lg">
          {savingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save All Settings
        </Button>
      </div>

      {/* API Key Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Monitor and manage external API integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <p className="text-sm text-muted-foreground">
              API keys are securely stored in Supabase Edge Function secrets.
            </p>
            <Button variant="outline" size="sm" onClick={fetchApiKeyStatus} disabled={loadingApiKeys} className="shrink-0 w-fit">
              {loadingApiKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-2 whitespace-nowrap">Refresh Status</span>
            </Button>
          </div>

          <div className="grid gap-3">
            {apiKeys.map((key) => (
              <div key={key.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {key.status === "configured" ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : key.status === "error" ? (
                    <XCircle className="w-5 h-5 text-orange-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{key.name}</p>
                    <p className="text-xs text-muted-foreground">{key.message || "Not configured"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={key.status === "configured" ? "default" : "destructive"}>
                    {key.status === "configured" ? "Active" : key.status === "error" ? "Error" : "Missing"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testApiConnection(key.name)}
                    disabled={key.testing}
                  >
                    {key.testing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Test"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mt-4">
            <p className="text-sm text-primary">
              💡 To update API keys, go to the Supabase Dashboard → Edge Functions → Secrets
            </p>
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => window.open("https://supabase.com/dashboard/project/eqikeuqwbphwongtfzhe/settings/functions", "_blank")}
            >
              Open Supabase Secrets <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Platform Configuration
          </CardTitle>
          <CardDescription>General platform settings and configurations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input id="supportEmail" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="platformDescription">Platform Description</Label>
            <Textarea id="platformDescription" value={platformDescription} onChange={(e) => setPlatformDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="maintenanceMode" checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
            </div>
            <Button onClick={savePlatformSettings} disabled={savingPlatform} size="sm">
              {savingPlatform ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TDS Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Percent className="w-5 h-5 mr-2" />
            TDS Settings
          </CardTitle>
          <CardDescription>Configure TDS (Tax Deducted at Source) rates for commission distribution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tdsWithPan">TDS Rate with PAN Verification (%)</Label>
              <Input id="tdsWithPan" type="number" min="0" max="100" value={tdsWithPan} onChange={(e) => setTdsWithPan(e.target.value)} />
              <p className="text-xs text-muted-foreground">Applied when user/celebrity has verified PAN</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tdsWithoutPan">TDS Rate without PAN Verification (%)</Label>
              <Input id="tdsWithoutPan" type="number" min="0" max="100" value={tdsWithoutPan} onChange={(e) => setTdsWithoutPan(e.target.value)} />
              <p className="text-xs text-muted-foreground">Applied when user/celebrity has not verified PAN</p>
            </div>
          </div>
          <Button onClick={saveTdsSettings} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save TDS Settings
          </Button>
        </CardContent>
      </Card>

      {/* Conversation Message Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Conversation Message Limits
          </CardTitle>
          <CardDescription>Configure message limits for celebrity-user conversations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="limitEnabled">Enable Message Limits</Label>
              <p className="text-xs text-muted-foreground">When disabled, conversations will have unlimited messages</p>
            </div>
            <Switch id="limitEnabled" checked={limitEnabled} onCheckedChange={setLimitEnabled} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="messageLimit">Message Limit per Conversation</Label>
              <Input id="messageLimit" type="number" min="1" max="999" value={messageLimit} onChange={(e) => setMessageLimit(e.target.value)} disabled={!limitEnabled} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warningOffset">Warning Offset</Label>
              <Input id="warningOffset" type="number" min="1" max="50" value={warningOffset} onChange={(e) => setWarningOffset(e.target.value)} disabled={!limitEnabled} />
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Current Configuration:</p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li>• Status: {limitEnabled ? "Enabled" : "Disabled (Unlimited)"}</li>
              <li>• Limit: {messageLimit} messages per conversation</li>
              <li>• Warning at: {parseInt(messageLimit) - parseInt(warningOffset)} messages</li>
            </ul>
          </div>
          <Button onClick={saveMessageSettings} disabled={savingMessages}>
            {savingMessages ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Message Settings
          </Button>
        </CardContent>
      </Card>

      {/* Music API Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Music className="w-5 h-5 mr-2" />
            Music API Configuration
          </CardTitle>
          <CardDescription>Configure AI music generation settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="musicApiEnabled">Enable Music API</Label>
              <p className="text-xs text-muted-foreground">Allow users to generate AI music</p>
            </div>
            <Switch id="musicApiEnabled" checked={musicApiEnabled} onCheckedChange={setMusicApiEnabled} />
          </div>
          <div className="space-y-2">
            <Label>Free Generations Per User (Monthly)</Label>
            <Input type="number" min="0" max="100" value={musicApiFreeLimit} onChange={(e) => setMusicApiFreeLimit(e.target.value)} />
          </div>
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <Button variant="outline" size="sm" onClick={testMusicApiConnection} disabled={testingMusicApi || !musicApiEnabled}>
              {testingMusicApi ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Test API Connection
            </Button>
          </div>
          <Button onClick={saveMusicApiSettings} disabled={savingMusic}>
            {savingMusic ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Music API Settings
          </Button>
        </CardContent>
      </Card>

      {/* HeyGen API Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="w-5 h-5 mr-2" />
            HeyGen API Configuration
          </CardTitle>
          <CardDescription>Configure HeyGen integration for AI avatar video generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              HeyGen API key is managed via Supabase Edge Function secrets.
            </p>
          </div>
          <div className="p-4 bg-primary/10 border border-primary/20 rounded">
            <p className="text-xs text-primary">
              ℹ️ Once configured, UGC video generations will automatically create AI avatar videos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Security Settings
          </CardTitle>
          <CardDescription>Configure security and access control settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-2">
              <Switch id="requireEmailVerification" checked={requireEmailVerification} onCheckedChange={setRequireEmailVerification} />
              <Label htmlFor="requireEmailVerification">Require Email Verification</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="enableTwoFactor" checked={enableTwoFactor} onCheckedChange={setEnableTwoFactor} />
              <Label htmlFor="enableTwoFactor">Enable Two-Factor Authentication</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input id="sessionTimeout" type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Input id="maxLoginAttempts" type="number" value={maxLoginAttempts} onChange={(e) => setMaxLoginAttempts(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveSecuritySettings} disabled={savingSecurity}>
            {savingSecurity ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Security Settings
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notification Settings
          </CardTitle>
          <CardDescription>Configure system notifications and alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-2">
              <Switch id="newUserNotifications" checked={newUserNotifications} onCheckedChange={setNewUserNotifications} />
              <Label htmlFor="newUserNotifications">New User Registrations</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="newBookingNotifications" checked={newBookingNotifications} onCheckedChange={setNewBookingNotifications} />
              <Label htmlFor="newBookingNotifications">New Bookings</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-2">
              <Switch id="celebrityApplications" checked={celebrityApplications} onCheckedChange={setCelebrityApplications} />
              <Label htmlFor="celebrityApplications">Celebrity Applications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="systemAlerts" checked={systemAlerts} onCheckedChange={setSystemAlerts} />
              <Label htmlFor="systemAlerts">System Alerts</Label>
            </div>
          </div>
          <Button onClick={saveNotificationSettings} disabled={savingNotifications}>
            {savingNotifications ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Notification Settings
          </Button>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Email Configuration
          </CardTitle>
          <CardDescription>Configure email service settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP Host</Label>
              <Input id="smtpHost" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP Port</Label>
              <Input id="smtpPort" type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="emailFrom">From Email</Label>
              <Input id="emailFrom" type="email" value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailFromName">From Name</Label>
              <Input id="emailFromName" value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveEmailSettings} disabled={savingEmail}>
            {savingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Email Settings
          </Button>
        </CardContent>
      </Card>

      {/* Bottom Save All Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={saveAllSettings} disabled={savingAll} size="lg" className="w-full md:w-auto">
          {savingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
