import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Mail, MessageSquare, Settings, FileText, Send, Activity, Plus, Pencil, Trash2, Eye, RefreshCw,
  CheckCircle2, XCircle, Loader2, Info, Clock, Users, Upload, Calendar, Newspaper
} from "lucide-react";
import { format } from "date-fns";

interface MessageTemplate {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

interface MessageEvent {
  id: string;
  event_key: string;
  description: string;
  email_template_id: string | null;
  whatsapp_template_id: string | null;
  delay_minutes: number;
  is_enabled: boolean;
}

interface MessageLog {
  id: string;
  channel: string;
  recipient: string;
  template_name: string | null;
  event_key: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
}

interface MessagingSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  is_encrypted: boolean;
  description: string | null;
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  template_id: string | null;
  recipient_filter: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

interface NewsletterSubscriber {
  id: string;
  email: string;
  status: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

// Template variables reference data
const TEMPLATE_VARIABLES = [
  { variable: "{{first_name}}", description: "User's first name", example: "John" },
  { variable: "{{last_name}}", description: "User's last name", example: "Doe" },
  { variable: "{{email}}", description: "User's email address", example: "john@example.com" },
  { variable: "{{phone}}", description: "User's phone number", example: "+919876543210" },
  { variable: "{{celebrity_name}}", description: "Celebrity's name", example: "Shah Rukh Khan" },
  { variable: "{{celebrity_category}}", description: "Celebrity's category", example: "Actor" },
  { variable: "{{order_id}}", description: "Order/Booking ID (short)", example: "abc123de" },
  { variable: "{{order_url}}", description: "Full order view URL", example: "https://wishmefinal.lovable.app/bookings/..." },
  { variable: "{{checkout_url}}", description: "Checkout continuation URL", example: "https://wishmefinal.lovable.app/checkout/..." },
  { variable: "{{service_type}}", description: "Type of service booked", example: "birthday_wish" },
  { variable: "{{order_amount}}", description: "Order total amount", example: "₹999" },
  { variable: "{{scheduled_date}}", description: "Gift scheduled delivery date", example: "Jan 25, 2026" },
  { variable: "{{video_url}}", description: "Video download/view URL", example: "https://..." },
  { variable: "{{platform_name}}", description: "Platform name", example: "Wish Me" },
  { variable: "{{platform_url}}", description: "Platform URL", example: "https://wishmefinal.lovable.app" },
];

const RECIPIENT_FILTERS = [
  { value: "all_users", label: "All Users", icon: Users },
  { value: "active_subscribers", label: "Active Subscribers", icon: Users },
  { value: "completed_orders", label: "Users with Completed Orders", icon: Users },
  { value: "all_celebrities", label: "All Celebrities", icon: Users },
];

export default function AdminMessaging() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [variablesDialogOpen, setVariablesDialogOpen] = useState(false);
  
  // Campaign dialog states
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    channel: "email",
    template_id: "",
    recipient_filter: "all_users",
    scheduled_at: "",
    send_immediately: true,
  });

  // API status states
  const [resendStatus, setResendStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [checkingResend, setCheckingResend] = useState(false);
  const [checkingWhatsapp, setCheckingWhatsapp] = useState(false);

  // Form states
  const [templateForm, setTemplateForm] = useState({
    name: "",
    channel: "email",
    subject: "",
    content: "",
    variables: "[]",
  });

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MessageTemplate[];
    },
  });

  // Fetch events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["message-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_events")
        .select("*")
        .order("event_key");
      if (error) throw error;
      return data as MessageEvent[];
    },
  });

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ["message-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  // Fetch logs
  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["message-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as MessageLog[];
    },
  });

  // Fetch settings
  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["messaging-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messaging_settings")
        .select("*")
        .order("setting_key");
      if (error) throw error;
      return data as MessagingSetting[];
    },
  });

  // Fetch newsletter subscribers
  const { data: subscribers = [], isLoading: subscribersLoading, refetch: refetchSubscribers } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscriptions")
        .select("*")
        .order("subscribed_at", { ascending: false });
      if (error) throw error;
      return data as NewsletterSubscriber[];
    },
  });

  // Bulk email states
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [bulkEmailForm, setBulkEmailForm] = useState({
    subject: "",
    content: "",
  });
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: {
      name: string;
      channel: string;
      subject: string | null;
      content: string;
      variables: string[];
      is_active: boolean;
    }) => {
      if (editingTemplate) {
        const { error } = await supabase
          .from("message_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("message_templates")
          .insert([templateData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
      toast.success(editingTemplate ? "Template updated" : "Template created");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast.success("Template deleted");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MessageEvent> }) => {
      const { error } = await supabase
        .from("message_events")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-events"] });
      toast.success("Event updated");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("messaging_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-settings"] });
      toast.success("Setting updated");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: {
      name: string;
      channel: string;
      template_id: string | null;
      recipient_filter: string;
      status: string;
      scheduled_at: string | null;
    }) => {
      const { error } = await supabase
        .from("message_campaigns")
        .insert([campaignData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-campaigns"] });
      setCampaignDialogOpen(false);
      resetCampaignForm();
      toast.success("Campaign created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("message_campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      channel: "email",
      subject: "",
      content: "",
      variables: "[]",
    });
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: "",
      channel: "email",
      template_id: "",
      recipient_filter: "all_users",
      scheduled_at: "",
      send_immediately: true,
    });
  };

  const openEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      channel: template.channel,
      subject: template.subject || "",
      content: template.content,
      variables: JSON.stringify(template.variables),
    });
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    let parsedVariables: string[] = [];
    try {
      parsedVariables = JSON.parse(templateForm.variables);
    } catch {
      parsedVariables = [];
    }

    saveTemplateMutation.mutate({
      name: templateForm.name,
      channel: templateForm.channel,
      subject: templateForm.channel === "email" ? templateForm.subject : null,
      content: templateForm.content,
      variables: parsedVariables,
      is_active: true,
    });
  };

  const handleCreateCampaign = () => {
    if (!campaignForm.name || !campaignForm.template_id) {
      toast.error("Please fill in campaign name and select a template");
      return;
    }

    createCampaignMutation.mutate({
      name: campaignForm.name,
      channel: campaignForm.channel,
      template_id: campaignForm.template_id,
      recipient_filter: campaignForm.recipient_filter,
      status: campaignForm.send_immediately ? "pending" : "scheduled",
      scheduled_at: campaignForm.send_immediately ? null : campaignForm.scheduled_at || null,
    });
  };

  const handleSendBulkEmail = async () => {
    if (!bulkEmailForm.subject || !bulkEmailForm.content) {
      toast.error("Please fill in subject and content");
      return;
    }

    setSendingBulkEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-newsletter', {
        body: {
          subject: bulkEmailForm.subject,
          content: bulkEmailForm.content,
          filter: 'active',
        },
      });

      if (error) throw error;

      toast.success(`Bulk email sent: ${data.sent} delivered, ${data.failed} failed`);
      setBulkEmailDialogOpen(false);
      setBulkEmailForm({ subject: "", content: "" });
      refetchLogs();
    } catch (error: any) {
      toast.error(error.message || "Failed to send bulk emails");
    } finally {
      setSendingBulkEmail(false);
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    const { error } = await supabase
      .from("newsletter_subscriptions")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Failed to remove subscriber");
    } else {
      toast.success("Subscriber removed");
      refetchSubscribers();
    }
  };

  const checkApiStatus = async (service: 'resend' | 'whatsapp') => {
    if (service === 'resend') {
      setCheckingResend(true);
    } else {
      setCheckingWhatsapp(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-messaging-status', {
        body: { service },
      });

      if (error) throw error;

      if (service === 'resend' && data.resend) {
        setResendStatus(data.resend);
        toast[data.resend.connected ? 'success' : 'error'](data.resend.message);
      } else if (service === 'whatsapp' && data.whatsapp) {
        setWhatsappStatus(data.whatsapp);
        toast[data.whatsapp.connected ? 'success' : 'error'](data.whatsapp.message);
      }
    } catch (error: any) {
      toast.error(`Failed to check ${service} status: ${error.message}`);
      if (service === 'resend') {
        setResendStatus({ connected: false, message: error.message });
      } else {
        setWhatsappStatus({ connected: false, message: error.message });
      }
    } finally {
      if (service === 'resend') {
        setCheckingResend(false);
      } else {
        setCheckingWhatsapp(false);
      }
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case "email":
        return <Badge variant="default"><Mail className="w-3 h-3 mr-1" />Email</Badge>;
      case "whatsapp":
        return <Badge variant="secondary"><MessageSquare className="w-3 h-3 mr-1" />WhatsApp</Badge>;
      case "both":
        return <Badge variant="outline">Both</Badge>;
      default:
        return <Badge>{channel}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="default">Sent</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "running":
        return <Badge className="bg-primary">Running</Badge>;
      case "scheduled":
        return <Badge variant="outline">Scheduled</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIndicator = (status: { connected: boolean; message: string } | null) => {
    if (!status) {
      return <span className="w-3 h-3 rounded-full bg-muted" />;
    }
    return status.connected ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-destructive" />
    );
  };

  // Filter settings for API Settings tab - exclude abandoned_cart_delay_minutes
  const otherSettings = settings.filter(
    s => !s.setting_key.includes('resend') && 
         !s.setting_key.includes('email') && 
         !s.setting_key.includes('whatsapp') &&
         s.setting_key !== 'abandoned_cart_delay_minutes'
  );

  // Get abandoned cart delay setting for Automation tab
  const abandonedCartDelaySetting = settings.find(s => s.setting_key === 'abandoned_cart_delay_minutes');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Messaging</h1>
          <p className="text-muted-foreground">Manage email & WhatsApp templates, automation, and campaigns</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="inline-flex w-max gap-1 p-1">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="flex items-center gap-2">
            <Newspaper className="w-4 h-4" />
            Newsletter
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            API Settings
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Message Templates</h2>
            <div className="flex gap-2">
              <Dialog open={variablesDialogOpen} onOpenChange={setVariablesDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Info className="w-4 h-4 mr-2" />
                    View Variables
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Available Template Variables</DialogTitle>
                    <DialogDescription>
                      Use these variables in your templates. They will be replaced with actual values when sending messages.
                    </DialogDescription>
                  </DialogHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variable</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Example</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {TEMPLATE_VARIABLES.map((v) => (
                        <TableRow key={v.variable}>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{v.variable}</code>
                          </TableCell>
                          <TableCell>{v.description}</TableCell>
                          <TableCell className="text-muted-foreground">{v.example}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DialogContent>
              </Dialog>
              
              <Dialog open={templateDialogOpen} onOpenChange={(open) => {
                setTemplateDialogOpen(open);
                if (!open) {
                  setEditingTemplate(null);
                  resetTemplateForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />New Template</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Template Name</Label>
                        <Input
                          value={templateForm.name}
                          onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                          placeholder="Welcome Email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Channel</Label>
                        <Select
                          value={templateForm.channel}
                          onValueChange={(value) => setTemplateForm({ ...templateForm, channel: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {templateForm.channel === "email" && (
                      <div className="space-y-2">
                        <Label>Subject Line</Label>
                        <Input
                          value={templateForm.subject}
                          onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                          placeholder="Welcome to Wish Me! 🎉"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Content {templateForm.channel === "email" ? "(HTML)" : "(Plain Text)"}</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setVariablesDialogOpen(true)}
                        >
                          <Info className="w-3 h-3 mr-1" />
                          Variables
                        </Button>
                      </div>
                      <Textarea
                        value={templateForm.content}
                        onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                        rows={10}
                        placeholder={templateForm.channel === "email" 
                          ? "<h1>Hello {{first_name}}!</h1>"
                          : "Hello {{first_name}}! Welcome to Wish Me."
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Variables (JSON array)</Label>
                      <Input
                        value={templateForm.variables}
                        onChange={(e) => setTemplateForm({ ...templateForm, variables: e.target.value })}
                        placeholder='["{{first_name}}", "{{email}}"]'
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
                      {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              {templatesLoading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{getChannelBadge(template.channel)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{template.subject || "-"}</TableCell>
                        <TableCell>
                          {template.is_active ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(template.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPreviewContent(template.content);
                              setPreviewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditTemplate(template)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <h2 className="text-xl font-semibold">Automation Rules</h2>
          
          {/* Abandoned Cart Settings Card - moved from API Settings */}
          {abandonedCartDelaySetting && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Abandoned Cart Settings
                </CardTitle>
                <CardDescription>
                  Configure timing for abandoned cart recovery emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label>Minutes to wait before sending reminder</Label>
                    <p className="text-sm text-muted-foreground">
                      Reminder will be sent after user abandons checkout for this duration
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24"
                      value={abandonedCartDelaySetting.setting_value}
                      onChange={(e) => updateSettingMutation.mutate({
                        key: abandonedCartDelaySetting.setting_key,
                        value: e.target.value
                      })}
                    />
                    <span className="text-muted-foreground">minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              {eventsLoading ? (
                <div className="text-center py-8">Loading events...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Email Template</TableHead>
                      <TableHead>WhatsApp Template</TableHead>
                      <TableHead>Delay</TableHead>
                      <TableHead>Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-sm">{event.event_key}</TableCell>
                        <TableCell>{event.description}</TableCell>
                        <TableCell>
                          <Select
                            value={event.email_template_id || "none"}
                            onValueChange={(value) => updateEventMutation.mutate({
                              id: event.id,
                              updates: { email_template_id: value === "none" ? null : value }
                            })}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {templates.filter(t => t.channel === "email" || t.channel === "both").map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={event.whatsapp_template_id || "none"}
                            onValueChange={(value) => updateEventMutation.mutate({
                              id: event.id,
                              updates: { whatsapp_template_id: value === "none" ? null : value }
                            })}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {templates.filter(t => t.channel === "whatsapp" || t.channel === "both").map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={event.delay_minutes}
                            onChange={(e) => updateEventMutation.mutate({
                              id: event.id,
                              updates: { delay_minutes: parseInt(e.target.value) || 0 }
                            })}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground ml-1">min</span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={event.is_enabled}
                            onCheckedChange={(checked) => updateEventMutation.mutate({
                              id: event.id,
                              updates: { is_enabled: checked }
                            })}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Bulk Campaigns</h2>
            <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />New Campaign</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Send bulk messages to selected recipients
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      placeholder="January Newsletter"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select
                      value={campaignForm.channel}
                      onValueChange={(value) => setCampaignForm({ ...campaignForm, channel: value, template_id: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select
                      value={campaignForm.template_id}
                      onValueChange={(value) => setCampaignForm({ ...campaignForm, template_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates
                          .filter(t => campaignForm.channel === "both" || t.channel === campaignForm.channel || t.channel === "both")
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Recipients</Label>
                    <Select
                      value={campaignForm.recipient_filter}
                      onValueChange={(value) => setCampaignForm({ ...campaignForm, recipient_filter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECIPIENT_FILTERS.map((filter) => (
                          <SelectItem key={filter.value} value={filter.value}>
                            <div className="flex items-center gap-2">
                              <filter.icon className="w-4 h-4" />
                              {filter.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="send-immediately"
                        checked={campaignForm.send_immediately}
                        onCheckedChange={(checked) => setCampaignForm({ ...campaignForm, send_immediately: checked })}
                      />
                      <Label htmlFor="send-immediately">Send immediately</Label>
                    </div>

                    {!campaignForm.send_immediately && (
                      <div className="space-y-2">
                        <Label>Schedule for</Label>
                        <Input
                          type="datetime-local"
                          value={campaignForm.scheduled_at}
                          onChange={(e) => setCampaignForm({ ...campaignForm, scheduled_at: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateCampaign} disabled={createCampaignMutation.isPending}>
                    {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {campaignsLoading ? (
                <div className="text-center py-8">Loading campaigns...</div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No campaigns yet</p>
                  <p className="text-sm">Create your first bulk campaign to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>{getChannelBadge(campaign.channel)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {RECIPIENT_FILTERS.find(f => f.value === campaign.recipient_filter)?.label || campaign.recipient_filter}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>
                          {campaign.total_recipients > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {campaign.sent_count}/{campaign.total_recipients}
                              </span>
                              {campaign.failed_count > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {campaign.failed_count} failed
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(campaign.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                            disabled={campaign.status === "running"}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <h2 className="text-xl font-semibold">API Configuration</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email (Resend)
                    {getStatusIndicator(resendStatus)}
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => checkApiStatus('resend')}
                    disabled={checkingResend}
                  >
                    {checkingResend ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Check Status</>
                    )}
                  </Button>
                </div>
                <CardDescription>Configure Resend API for email sending</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.filter(s => s.setting_key.includes('resend') || s.setting_key.includes('email')).map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <Label>{setting.description || setting.setting_key}</Label>
                    <Input
                      type={setting.is_encrypted ? "password" : "text"}
                      value={setting.setting_value}
                      onChange={(e) => updateSettingMutation.mutate({
                        key: setting.setting_key,
                        value: e.target.value
                      })}
                      placeholder={setting.is_encrypted ? "••••••••" : "Enter value"}
                    />
                  </div>
                ))}
                {resendStatus && (
                  <p className={`text-sm ${resendStatus.connected ? 'text-green-600' : 'text-destructive'}`}>
                    {resendStatus.message}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    WhatsApp (Meta)
                    {getStatusIndicator(whatsappStatus)}
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => checkApiStatus('whatsapp')}
                    disabled={checkingWhatsapp}
                  >
                    {checkingWhatsapp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Check Status</>
                    )}
                  </Button>
                </div>
                <CardDescription>Configure Meta WhatsApp Business API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.filter(s => s.setting_key.includes('whatsapp')).map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <Label>{setting.description || setting.setting_key}</Label>
                    <Input
                      type={setting.is_encrypted ? "password" : "text"}
                      value={setting.setting_value}
                      onChange={(e) => updateSettingMutation.mutate({
                        key: setting.setting_key,
                        value: e.target.value
                      })}
                      placeholder={setting.is_encrypted ? "••••••••" : "Enter value"}
                    />
                  </div>
                ))}
                {whatsappStatus && (
                  <p className={`text-sm ${whatsappStatus.connected ? 'text-green-600' : 'text-destructive'}`}>
                    {whatsappStatus.message}
                  </p>
                )}
              </CardContent>
            </Card>

            {otherSettings.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Other Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {otherSettings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between">
                      <div>
                        <Label>{setting.description || setting.setting_key}</Label>
                        <p className="text-sm text-muted-foreground">{setting.setting_key}</p>
                      </div>
                      <Input
                        className="w-48"
                        value={setting.setting_value}
                        onChange={(e) => updateSettingMutation.mutate({
                          key: setting.setting_key,
                          value: e.target.value
                        })}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Newsletter Subscribers Tab */}
        <TabsContent value="newsletter" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Newsletter Subscribers</h2>
              <p className="text-sm text-muted-foreground">
                {subscribers.filter(s => s.status === 'active').length} active subscribers
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetchSubscribers()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={bulkEmailDialogOpen} onOpenChange={setBulkEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Send className="w-4 h-4 mr-2" />
                    Send Bulk Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Send Bulk Email to Subscribers</DialogTitle>
                    <DialogDescription>
                      Send an email to all active newsletter subscribers ({subscribers.filter(s => s.status === 'active').length} recipients)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Email Subject</Label>
                      <Input
                        value={bulkEmailForm.subject}
                        onChange={(e) => setBulkEmailForm({ ...bulkEmailForm, subject: e.target.value })}
                        placeholder="📣 Exciting News from Wish Me!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Content (HTML supported)</Label>
                      <Textarea
                        value={bulkEmailForm.content}
                        onChange={(e) => setBulkEmailForm({ ...bulkEmailForm, content: e.target.value })}
                        placeholder="<h2>Hello!</h2><p>We have exciting news to share...</p>"
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use HTML tags for formatting. The content will be wrapped in our email template.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBulkEmailDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendBulkEmail} disabled={sendingBulkEmail}>
                      {sendingBulkEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send to All Subscribers
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              {subscribersLoading ? (
                <div className="text-center py-8">Loading subscribers...</div>
              ) : subscribers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No newsletter subscribers yet</p>
                  <p className="text-sm mt-2">Subscribers will appear here when users sign up via the footer form</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subscribed</TableHead>
                      <TableHead>Unsubscribed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((subscriber) => (
                      <TableRow key={subscriber.id}>
                        <TableCell className="font-medium">{subscriber.email}</TableCell>
                        <TableCell>
                          <Badge variant={subscriber.status === 'active' ? 'default' : 'secondary'}>
                            {subscriber.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(subscriber.subscribed_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {subscriber.unsubscribed_at 
                            ? format(new Date(subscriber.unsubscribed_at), "MMM d, yyyy HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubscriber(subscriber.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Message Logs</h2>
            <Button variant="outline" onClick={() => refetchLogs()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {logsLoading ? (
                <div className="text-center py-8">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No message logs yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.sent_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>{getChannelBadge(log.channel)}</TableCell>
                        <TableCell className="font-mono text-sm max-w-[200px] truncate">
                          {log.recipient}
                        </TableCell>
                        <TableCell>{log.template_name || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{log.event_key || "-"}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                          {log.error_message || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
