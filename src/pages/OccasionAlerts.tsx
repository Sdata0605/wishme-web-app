import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarIcon, Bell, Heart, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isBefore, addDays } from "date-fns";

interface OccasionAlert {
  id: string;
  occasion_name: string;
  occasion_type: string;
  occasion_date: string;
  alert_enabled: boolean;
  auto_send_enabled: boolean;
  alert_days_before: number;
  loved_one_id?: string;
  celebrity_id?: string;
  loved_ones?: {
    first_name: string;
    last_name?: string;
  };
  celebrities?: {
    name: string;
  };
}

export default function OccasionAlerts() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<OccasionAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchAlerts();
    }
  }, [profile?.id]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('occasion_alerts')
        .select(`
          *,
          loved_ones (first_name, last_name),
          celebrities!occasion_alerts_celebrity_id_fkey (name)
        `)
        .eq('user_id', profile?.id)
        .order('occasion_date');

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load occasion alerts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAlert = async (alertId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('occasion_alerts')
        .update({ alert_enabled: !currentValue })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, alert_enabled: !currentValue } : alert
      ));

      toast({
        title: !currentValue ? "Alert Enabled" : "Alert Disabled",
        description: !currentValue ? "You'll receive notifications for this occasion" : "Alerts disabled for this occasion"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getDaysUntil = (dateString: string) => {
    const occasionDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = occasionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getAlertStatus = (occasionDate: string, alertDaysBefore: number) => {
    const daysUntil = getDaysUntil(occasionDate);
    
    if (daysUntil < 0) return { label: "Past", variant: "secondary" as const };
    if (daysUntil === 0) return { label: "Today!", variant: "destructive" as const };
    if (daysUntil <= alertDaysBefore) return { label: `${daysUntil} days`, variant: "destructive" as const };
    if (daysUntil <= 30) return { label: `${daysUntil} days`, variant: "default" as const };
    return { label: format(new Date(occasionDate), 'MMM dd, yyyy'), variant: "outline" as const };
  };

  const upcomingAlerts = alerts.filter(alert => getDaysUntil(alert.occasion_date) >= 0);
  const pastAlerts = alerts.filter(alert => getDaysUntil(alert.occasion_date) < 0);

  return (
    <AuthenticatedLayout showSidebar>
      <div className="container mx-auto px-4 py-8 pt-20 md:pt-24 mobile-safe-bottom">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <Bell className="w-8 h-8" />
            Occasion Alerts
          </h1>
          <p className="text-muted-foreground">
            Never miss a special moment - get reminders for birthdays, anniversaries, and celebrity events
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                  <p className="text-3xl font-bold">{upcomingAlerts.length}</p>
                </div>
                <CalendarIcon className="w-10 h-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-3xl font-bold">
                    {upcomingAlerts.filter(a => getDaysUntil(a.occasion_date) <= 7).length}
                  </p>
                </div>
                <Bell className="w-10 h-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Auto-Send Enabled</p>
                  <p className="text-3xl font-bold">
                    {alerts.filter(a => a.auto_send_enabled).length}
                  </p>
                </div>
                <Star className="w-10 h-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-4">No occasion alerts set up yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Add loved ones with their birthdates or follow celebrity events to get started
              </p>
              <Button onClick={() => navigate('/loved-ones')}>
                Add Loved Ones
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Upcoming Alerts */}
            {upcomingAlerts.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Upcoming Occasions</h2>
                <div className="space-y-4">
                  {upcomingAlerts.map((alert) => {
                    const status = getAlertStatus(alert.occasion_date, alert.alert_days_before);
                    const personName = alert.loved_ones 
                      ? `${alert.loved_ones.first_name} ${alert.loved_ones.last_name || ''}`.trim()
                      : alert.celebrities?.name || "Unknown";

                    return (
                      <Card key={alert.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {alert.loved_one_id && <Heart className="w-5 h-5 text-primary" />}
                                {alert.celebrity_id && <Star className="w-5 h-5 text-primary" />}
                                <CardTitle className="text-lg">{personName}</CardTitle>
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </div>
                              <CardDescription>
                                {alert.occasion_name} • {alert.occasion_type}
                              </CardDescription>
                            </div>
                            <Switch
                              checked={alert.alert_enabled}
                              onCheckedChange={() => toggleAlert(alert.id, alert.alert_enabled)}
                            />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              Alert {alert.alert_days_before} days before • {format(new Date(alert.occasion_date), 'MMMM dd, yyyy')}
                            </div>
                            {alert.auto_send_enabled && (
                              <Badge variant="default">Auto-Send Enabled</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Alerts */}
            {pastAlerts.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Past Occasions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pastAlerts.map((alert) => {
                    const personName = alert.loved_ones 
                      ? `${alert.loved_ones.first_name} ${alert.loved_ones.last_name || ''}`.trim()
                      : alert.celebrities?.name || "Unknown";

                    return (
                      <Card key={alert.id} className="opacity-75">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{personName}</p>
                              <p className="text-sm text-muted-foreground">{alert.occasion_name}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(alert.occasion_date), 'MMM dd, yyyy')}</p>
                            </div>
                            <Badge variant="secondary">Past</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
