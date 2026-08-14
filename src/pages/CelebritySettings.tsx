import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CelebritySettings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    email_notifications: true,
    booking_alerts: true,
    commission_alerts: true,
    marketing_emails: false,
    auto_accept_bookings: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [celebrityId, setCelebrityId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchSettings();
    }
  }, [profile]);

  const fetchSettings = async () => {
    try {
      // Get celebrity ID from profile
      const { data: celebData } = await supabase
        .from('celebrities')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (celebData) {
        setCelebrityId(celebData.id);
        
        const { data, error } = await supabase
          .from('celebrity_settings')
          .select('*')
          .eq('celebrity_id', celebData.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setSettings({
            email_notifications: data.email_notifications,
            booking_alerts: data.booking_alerts,
            commission_alerts: data.commission_alerts,
            marketing_emails: data.marketing_emails,
            auto_accept_bookings: data.auto_accept_bookings
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!celebrityId) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('celebrity_settings')
        .upsert({
          celebrity_id: celebrityId,
          ...settings
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate('/celebrity-dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your preferences and notifications</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for important updates
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, email_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="booking-alerts">Booking Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you receive new booking requests
                  </p>
                </div>
                <Switch
                  id="booking-alerts"
                  checked={settings.booking_alerts}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, booking_alerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="commission-alerts">Commission Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when you earn commission
                  </p>
                </div>
                <Switch
                  id="commission-alerts"
                  checked={settings.commission_alerts}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, commission_alerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-emails">Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive promotional emails and platform updates
                  </p>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={settings.marketing_emails}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, marketing_emails: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-accept">Auto-accept Bookings</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically accept all incoming booking requests
                  </p>
                </div>
                <Switch
                  id="auto-accept"
                  checked={settings.auto_accept_bookings}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, auto_accept_bookings: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving} size="lg">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
