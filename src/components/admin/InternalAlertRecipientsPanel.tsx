import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Users, Plus, Mail, Smartphone, MessageSquare, Trash2, Pencil,
  Send, AlertTriangle, Shield, Loader2, Bell, Zap, ShieldAlert
} from "lucide-react";
import { Label } from "@/components/ui/label";

interface Recipient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  role_tag: string;
  channels: { email: boolean; sms: boolean; whatsapp: boolean };
  alert_types: { api_failure: boolean; critical_bug: boolean; edge_function_error: boolean; manual_broadcast: boolean; security_alert: boolean };
  is_active: boolean;
  created_at: string;
}

const ROLE_TAGS = ["Tech Lead", "Support", "Admin", "DevOps", "Custom"];
const ALERT_TYPE_LABELS: Record<string, string> = {
  api_failure: "API Failure",
  critical_bug: "Critical Bug",
  edge_function_error: "Edge Fn Error",
  manual_broadcast: "Manual Broadcast",
  security_alert: "Security Alert",
};

const ALERT_RULES = [
  { key: "alert_rule_api_failure_enabled", label: "API Health Failure", description: "Trigger alert when any API test returns a failure status", alertType: "api_failure" },
  { key: "alert_rule_all_apis_tested_enabled", label: "All APIs Tested", description: "Send summary report after every 'Test All' run", alertType: "api_failure" },
  { key: "alert_rule_critical_audit_log_enabled", label: "Critical Severity Audit Log", description: "When a critical event is logged in activity logs", alertType: "critical_bug" },
  { key: "alert_rule_edge_function_errors_enabled", label: "Edge Function Error Rate", description: "If any edge function returns errors 3+ times in 10 minutes", alertType: "edge_function_error" },
  { key: "alert_rule_security_alert_enabled", label: "Security Alert", description: "When suspicious activity detected (5+ warnings from same user in 1hr)", alertType: "security_alert" },
];

const emptyRecipient = (): Omit<Recipient, "id" | "created_at"> => ({
  name: "",
  email: "",
  phone: null,
  whatsapp: null,
  role_tag: "Admin",
  channels: { email: true, sms: false, whatsapp: false },
  alert_types: { api_failure: true, critical_bug: true, edge_function_error: true, manual_broadcast: true, security_alert: true },
  is_active: true,
});

export default function InternalAlertRecipientsPanel() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRecipient());
  const [saving, setSaving] = useState(false);
  const [alertRules, setAlertRules] = useState<Record<string, boolean>>({});
  const [rulesLoading, setRulesLoading] = useState(true);

  // Broadcast state
  const [broadcastType, setBroadcastType] = useState("api_failure");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastChannels, setBroadcastChannels] = useState({ email: true, sms: false, whatsapp: false });
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [sending, setSending] = useState(false);

  const loadRecipients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("internal_alert_recipients" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setRecipients((data || []) as unknown as Recipient[]);
    } catch (err) {
      console.error("Load recipients error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAlertRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const keys = ALERT_RULES.map(r => r.key);
      const { data } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value")
        .in("setting_key", keys);

      const rules: Record<string, boolean> = {};
      for (const r of ALERT_RULES) {
        const found = data?.find(d => d.setting_key === r.key);
        rules[r.key] = found ? found.setting_value === "true" : false;
      }
      setAlertRules(rules);
    } catch {
      // silent
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipients();
    loadAlertRules();
  }, [loadRecipients, loadAlertRules]);

  const handleSaveRecipient = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Validation", description: "Name and Email are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || null,
        whatsapp: form.whatsapp?.trim() || null,
        role_tag: form.role_tag,
        channels: form.channels,
        alert_types: form.alert_types,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from("internal_alert_recipients" as any).update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Updated", description: `${form.name} updated.` });
      } else {
        const { error } = await supabase.from("internal_alert_recipients" as any).insert(payload);
        if (error) throw error;
        toast({ title: "Added", description: `${form.name} added as alert recipient.` });
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyRecipient());
      loadRecipients();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name} from alert recipients?`)) return;
    try {
      await supabase.from("internal_alert_recipients" as any).delete().eq("id", id);
      toast({ title: "Deleted", description: `${name} removed.` });
      loadRecipients();
    } catch {
      toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("internal_alert_recipients" as any).update({ is_active: active }).eq("id", id);
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, is_active: active } : r));
  };

  const handleRuleToggle = async (key: string, value: boolean) => {
    setAlertRules(prev => ({ ...prev, [key]: value }));
    try {
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("setting_key", key)
        .maybeSingle();

      if (existing) {
        await supabase.from("platform_settings").update({ setting_value: String(value) }).eq("setting_key", key);
      } else {
        await supabase.from("platform_settings").insert({ setting_key: key, setting_value: String(value) });
      }
      toast({ title: `Rule ${value ? "enabled" : "disabled"}` });
    } catch {
      toast({ title: "Error", description: "Failed to save rule.", variant: "destructive" });
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      toast({ title: "Missing fields", description: "Subject and message are required.", variant: "destructive" });
      return;
    }

    const targets = broadcastTarget === "all"
      ? recipients.filter(r => r.is_active)
      : recipients.filter(r => r.id === broadcastTarget && r.is_active);

    if (targets.length === 0) {
      toast({ title: "No recipients", description: "No active recipients to send to.", variant: "destructive" });
      return;
    }

    setSending(true);
    let sentCount = 0;
    const channelsSent: string[] = [];

    try {
      for (const recipient of targets) {
        const channels = [];
        if (broadcastChannels.email && recipient.channels.email) channels.push("email");
        if (broadcastChannels.sms && recipient.channels.sms && recipient.phone) channels.push("sms");
        if (broadcastChannels.whatsapp && recipient.channels.whatsapp && (recipient.whatsapp || recipient.phone)) channels.push("whatsapp");

        for (const channel of channels) {
          try {
            await supabase.functions.invoke("send-wishme-notification", {
              body: {
                event_key: "admin_new_user_alert",
                recipient_type: "admin",
                data: {
                  full_name: recipient.name,
                  email: recipient.email,
                  recipient_email: channel === "email" ? recipient.email : undefined,
                  recipient_phone: channel !== "email" ? (recipient.whatsapp || recipient.phone) : undefined,
                  email_subject: broadcastSubject,
                  email_body: broadcastMessage,
                  sms_body: broadcastMessage,
                  whatsapp_body: broadcastMessage,
                },
              },
            });
            sentCount++;
            if (!channelsSent.includes(channel)) channelsSent.push(channel);
          } catch {
            // continue to next
          }
        }
      }

      toast({
        title: "Broadcast Sent",
        description: `Sent to ${sentCount} recipient(s) via ${channelsSent.join(", ") || "no channels"}`,
      });
      setBroadcastSubject("");
      setBroadcastMessage("");
    } catch {
      toast({ title: "Error", description: "Broadcast failed.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const openEdit = (r: Recipient) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      email: r.email,
      phone: r.phone,
      whatsapp: r.whatsapp,
      role_tag: r.role_tag,
      channels: { ...r.channels },
      alert_types: { ...r.alert_types },
      is_active: r.is_active,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 mt-10">
      {/* Section Header */}
      <div className="border-t-2 border-dashed border-border pt-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-destructive/10">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              Internal Alert Recipients
              <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">Internal Only</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">When APIs go down, bugs occur, or system errors are detected — notify your internal team instantly</p>
          </div>
        </div>
      </div>

      {/* Sub-section A: Recipient Management */}
      <Card className="border-muted bg-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Team Members
            </CardTitle>
            <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyRecipient()); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Recipient
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : recipients.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-30" />
              <p className="font-medium">No alert recipients added</p>
              <p className="text-sm">Add team members to receive internal alerts</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name / Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone / WhatsApp</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Alert Types</TableHead>
                    <TableHead className="w-[70px]">Active</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map(r => (
                    <TableRow key={r.id} className={!r.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{r.name}</span>
                          <Badge variant="outline" className="w-fit text-[10px] mt-0.5">{r.role_tag}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.phone || "—"}{r.whatsapp && r.whatsapp !== r.phone ? ` / ${r.whatsapp}` : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Mail className={`h-4 w-4 ${r.channels.email ? "text-primary" : "text-muted-foreground/30"}`} />
                          <Smartphone className={`h-4 w-4 ${r.channels.sms ? "text-primary" : "text-muted-foreground/30"}`} />
                          <MessageSquare className={`h-4 w-4 ${r.channels.whatsapp ? "text-primary" : "text-muted-foreground/30"}`} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(r.alert_types)
                            .filter(([, v]) => v)
                            .map(([k]) => (
                              <Badge key={k} variant="secondary" className="text-[9px]">
                                {ALERT_TYPE_LABELS[k] || k}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={r.is_active} onCheckedChange={v => handleToggleActive(r.id, v)} className="scale-75" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id, r.name)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sub-section B: Manual Broadcast */}
      <Card className="border-muted bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" /> Manual Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Alert Type</Label>
              <Select value={broadcastType} onValueChange={setBroadcastType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="api_failure">API Failure</SelectItem>
                  <SelectItem value="critical_bug">Critical Bug</SelectItem>
                  <SelectItem value="security_alert">Security Alert</SelectItem>
                  <SelectItem value="general_update">General Update</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Send To</Label>
              <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active Recipients</SelectItem>
                  {recipients.filter(r => r.is_active).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.role_tag})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={broadcastSubject} onChange={e => setBroadcastSubject(e.target.value)} placeholder="e.g. HeyGen API is down" />
          </div>

          <div>
            <Label className="text-xs">Message</Label>
            <Textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Describe the issue or update..." className="min-h-[100px]" />
          </div>

          <div className="flex items-center gap-4">
            <Label className="text-xs">Channels:</Label>
            <label className="flex items-center gap-1.5 text-sm">
              <Checkbox checked={broadcastChannels.email} onCheckedChange={v => setBroadcastChannels(p => ({ ...p, email: !!v }))} />
              <Mail className="h-3.5 w-3.5" /> Email
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <Checkbox checked={broadcastChannels.sms} onCheckedChange={v => setBroadcastChannels(p => ({ ...p, sms: !!v }))} />
              <Smartphone className="h-3.5 w-3.5" /> SMS
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <Checkbox checked={broadcastChannels.whatsapp} onCheckedChange={v => setBroadcastChannels(p => ({ ...p, whatsapp: !!v }))} />
              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
            </label>
          </div>

          <Button onClick={handleBroadcast} disabled={sending} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send Now
          </Button>
        </CardContent>
      </Card>

      {/* Sub-section C: Alert Trigger Rules */}
      <Card className="border-muted bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Alert Trigger Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rulesLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-1">
              {ALERT_RULES.map((rule, i) => (
                <div key={rule.key}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{rule.label}</p>
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    </div>
                    <Switch checked={alertRules[rule.key] || false} onCheckedChange={v => handleRuleToggle(rule.key, v)} />
                  </div>
                  {i < ALERT_RULES.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Recipient Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Recipient" : "Add Alert Recipient"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div>
                <Label className="text-xs">Role Tag</Label>
                <Select value={form.role_tag} onValueChange={v => setForm(p => ({ ...p, role_tag: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_TAGS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Email *</Label>
              <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@company.com" type="email" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone (SMS)</Label>
                <Input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value || null }))} placeholder="+91 98765 43210" />
              </div>
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <Input value={form.whatsapp || ""} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value || null }))} placeholder="Same as phone?" />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs mb-2 block">Channels</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={form.channels.email} onCheckedChange={v => setForm(p => ({ ...p, channels: { ...p.channels, email: !!v } }))} />
                  Email
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={form.channels.sms} onCheckedChange={v => setForm(p => ({ ...p, channels: { ...p.channels, sms: !!v } }))} />
                  SMS
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={form.channels.whatsapp} onCheckedChange={v => setForm(p => ({ ...p, channels: { ...p.channels, whatsapp: !!v } }))} />
                  WhatsApp
                </label>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Alert Types</Label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={(form.alert_types as any)[key] || false}
                      onCheckedChange={v => setForm(p => ({ ...p, alert_types: { ...p.alert_types, [key]: !!v } }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleSaveRecipient} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Update Recipient" : "Add Recipient"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
