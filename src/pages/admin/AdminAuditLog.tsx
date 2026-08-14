import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Search, Download, ChevronLeft, ChevronRight,
  AlertTriangle, Activity, Users, Flag, Eye, X, RefreshCw
} from "lucide-react";
import { format, subDays, subHours, startOfDay } from "date-fns";

interface ActivityLog {
  id: string;
  user_id: string | null;
  profile_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_role: string | null;
  user_plan: string | null;
  action_category: string;
  action_type: string;
  action_label: string;
  severity: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  created_at: string;
}

interface Stats {
  todayTotal: number;
  criticalLast24h: number;
  uniqueUsersToday: number;
  suspiciousLastHour: number;
}

const CATEGORIES = ['All', 'auth', 'booking', 'payment', 'profile', 'celebrity', 'admin', 'content', 'referral', 'wallet', 'messaging', 'security'];
const SEVERITIES = ['All', 'info', 'warning', 'critical'];
const ROLES = ['All', 'user', 'celebrity', 'admin'];
const DEVICES = ['All', 'mobile', 'desktop', 'tablet'];
const PAGE_SIZE = 50;

const severityColor = (s: string) => {
  switch (s) {
    case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'warning': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    default: return 'bg-primary/10 text-primary border-primary/20';
  }
};

const severityDot = (s: string) => {
  switch (s) {
    case 'critical': return 'bg-destructive';
    case 'warning': return 'bg-yellow-500';
    default: return 'bg-green-500';
  }
};

const categoryBadge = (c: string) => {
  const colors: Record<string, string> = {
    auth: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    booking: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    payment: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    profile: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    celebrity: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    admin: 'bg-destructive/10 text-destructive',
    content: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
    security: 'bg-destructive/10 text-destructive',
    referral: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
    wallet: 'bg-green-500/10 text-green-700 dark:text-green-400',
    messaging: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  };
  return colors[c] || 'bg-muted text-muted-foreground';
};

export default function AdminAuditLog() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats>({ todayTotal: 0, criticalLast24h: 0, uniqueUsersToday: 0, suspiciousLastHour: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [role, setRole] = useState("All");
  const [device, setDevice] = useState("All");
  const [dateRange, setDateRange] = useState("7");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [userDrilldown, setUserDrilldown] = useState<{ userId: string; userName: string } | null>(null);
  const [userLogs, setUserLogs] = useState<ActivityLog[]>([]);
  const [userLogsLoading, setUserLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("logs");
  const [securityAlerts, setSecurityAlerts] = useState<ActivityLog[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);

  const getDateFilter = useCallback(() => {
    if (dateRange === '1') return startOfDay(new Date()).toISOString();
    if (dateRange === '7') return subDays(new Date(), 7).toISOString();
    if (dateRange === '30') return subDays(new Date(), 30).toISOString();
    return subDays(new Date(), 7).toISOString();
  }, [dateRange]);

  const fetchStats = useCallback(async () => {
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const last24h = subHours(new Date(), 24).toISOString();
      const lastHour = subHours(new Date(), 1).toISOString();

      const [todayRes, criticalRes, suspiciousRes] = await Promise.all([
        supabase.from('user_activity_logs' as any).select('user_id', { count: 'exact', head: false }).gte('created_at', todayStart),
        supabase.from('user_activity_logs' as any).select('*', { count: 'exact', head: true }).eq('severity', 'critical').gte('created_at', last24h),
        supabase.from('user_activity_logs' as any).select('*', { count: 'exact', head: true }).in('severity', ['warning', 'critical']).gte('created_at', lastHour),
      ]);

      const uniqueUsers = new Set((todayRes.data || []).map((r: any) => r.user_id)).size;

      setStats({
        todayTotal: todayRes.count || (todayRes.data?.length || 0),
        criticalLast24h: criticalRes.count || 0,
        uniqueUsersToday: uniqueUsers,
        suspiciousLastHour: suspiciousRes.count || 0,
      });
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_activity_logs' as any)
        .select('*', { count: 'exact' })
        .gte('created_at', getDateFilter())
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (category !== 'All') query = query.eq('action_category', category);
      if (severity !== 'All') query = query.eq('severity', severity);
      if (role !== 'All') query = query.eq('user_role', role);
      if (device !== 'All') query = query.eq('device_type', device);
      if (search.trim()) {
        query = query.or(`user_name.ilike.%${search}%,user_email.ilike.%${search}%,action_label.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      setLogs((data || []) as unknown as ActivityLog[]);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, category, severity, role, device, search, dateRange, getDateFilter]);

  const fetchSecurityAlerts = useCallback(async () => {
    setSecurityLoading(true);
    try {
      const last24h = subHours(new Date(), 24).toISOString();
      const { data, error } = await supabase
        .from('user_activity_logs' as any)
        .select('*')
        .in('severity', ['warning', 'critical'])
        .gte('created_at', last24h)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setSecurityAlerts((data || []) as unknown as ActivityLog[]);
    } catch (err) {
      console.error('Security alerts fetch error:', err);
    } finally {
      setSecurityLoading(false);
    }
  }, []);

  const fetchUserDrilldown = useCallback(async (userId: string) => {
    setUserLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_activity_logs' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setUserLogs((data || []) as unknown as ActivityLog[]);
    } catch (err) {
      console.error('User drilldown error:', err);
    } finally {
      setUserLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [fetchStats, fetchLogs]);

  useEffect(() => {
    if (activeTab === 'security') fetchSecurityAlerts();
  }, [activeTab, fetchSecurityAlerts]);

  useEffect(() => {
    if (userDrilldown) fetchUserDrilldown(userDrilldown.userId);
  }, [userDrilldown, fetchUserDrilldown]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('audit-log-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_activity_logs' }, (payload) => {
        const newLog = payload.new as ActivityLog;
        setLogs(prev => [newLog, ...prev].slice(0, PAGE_SIZE));
        setTotalCount(prev => prev + 1);
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStats]);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast({ title: "No data", description: "No logs to export.", variant: "destructive" });
      return;
    }
    const headers = ['Timestamp', 'User', 'Email', 'Role', 'Category', 'Action', 'Severity', 'Entity', 'Device'];
    const rows = logs.map(l => [
      format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss'),
      l.user_name || '', l.user_email || '', l.user_role || '',
      l.action_category, l.action_label, l.severity,
      l.entity_label || '', l.device_type || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFlagUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_flagged: true } as any)
        .eq('user_id', userId);
      if (error) throw error;
      toast({ title: "User flagged", description: "User has been flagged for review." });
    } catch {
      toast({ title: "Error", description: "Failed to flag user.", variant: "destructive" });
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Group security alerts by user
  const securityByUser = securityAlerts.reduce<Record<string, ActivityLog[]>>((acc, log) => {
    const key = log.user_id || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 md:h-7 md:w-7 text-primary" />
          Activity Audit Log
        </h1>
        <p className="text-sm text-muted-foreground">Track every meaningful action across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Activity className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.todayTotal}</p>
              <p className="text-xs text-muted-foreground">Events Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.criticalLast24h}</p>
              <p className="text-xs text-muted-foreground">Critical (24h)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.uniqueUsersToday}</p>
              <p className="text-xs text-muted-foreground">Active Users Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><AlertTriangle className="h-5 w-5 text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.suspiciousLastHour}</p>
              <p className="text-xs text-muted-foreground">Suspicious (1h)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs">All Logs</TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Security Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search user, email, or action..."
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(0); }}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                  <Select value={dateRange} onValueChange={v => { setDateRange(v); setPage(0); }}>
                    <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Today</SelectItem>
                      <SelectItem value="7">Last 7 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={category} onValueChange={v => { setCategory(v); setPage(0); }}>
                    <SelectTrigger className="w-full sm:w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c === 'All' ? 'All Categories' : c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={severity} onValueChange={v => { setSeverity(v); setPage(0); }}>
                    <SelectTrigger className="w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All Severity' : s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={role} onValueChange={v => { setRole(v); setPage(0); }}>
                    <SelectTrigger className="w-full sm:w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r === 'All' ? 'All Roles' : r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => { fetchLogs(); fetchStats(); }}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Shield className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">No activity logs found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead className="w-[80px]">Severity</TableHead>
                        <TableHead>Affected</TableHead>
                        <TableHead className="w-[80px]">Device</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map(log => (
                        <TableRow
                          key={log.id}
                          className={`cursor-pointer ${
                            log.severity === 'critical' ? 'bg-destructive/5' :
                            log.severity === 'warning' ? 'bg-yellow-500/5' : ''
                          }`}
                          onClick={() => setSelectedLog(log)}
                        >
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <button
                                className="text-sm font-medium text-left hover:underline text-primary"
                                onClick={e => {
                                  e.stopPropagation();
                                  if (log.user_id) setUserDrilldown({ userId: log.user_id, userName: log.user_name || log.user_email || 'Unknown' });
                                }}
                              >
                                {log.user_name || 'Unknown'}
                              </button>
                              <span className="text-xs text-muted-foreground">{log.user_email}</span>
                              {log.user_role && (
                                <Badge variant="outline" className="w-fit text-[10px] mt-0.5">{log.user_role}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className={`w-fit text-[10px] ${categoryBadge(log.action_category)}`}>
                                {log.action_category}
                              </Badge>
                              <span className="text-sm">{log.action_label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${severityDot(log.severity)}`} />
                              <span className="text-xs capitalize">{log.severity}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.entity_label || (log.entity_type ? `${log.entity_type}:${log.entity_id?.slice(0, 8)}` : '—')}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs capitalize text-muted-foreground">{log.device_type || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setSelectedLog(log); }}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {totalCount > PAGE_SIZE && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Alerts Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Security Alerts (Last 24 Hours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {securityLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : Object.keys(securityByUser).length === 0 ? (
                <div className="flex flex-col items-center py-10 text-muted-foreground">
                  <Shield className="h-10 w-10 mb-2 opacity-30" />
                  <p>No security alerts in the last 24 hours</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(securityByUser).map(([userId, userAlerts]) => {
                    const isSuspicious = userAlerts.length >= 5;
                    const userName = userAlerts[0]?.user_name || userAlerts[0]?.user_email || 'Unknown';
                    return (
                      <Card key={userId} className={isSuspicious ? 'border-destructive bg-destructive/5' : ''}>
                        <CardContent className="p-4">
                          {isSuspicious && (
                            <div className="flex items-center gap-2 mb-3 text-destructive text-sm font-medium">
                              <AlertTriangle className="h-4 w-4" />
                              Suspicious Activity Detected — {userAlerts.length} alerts
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <button
                                className="font-medium hover:underline text-primary"
                                onClick={() => setUserDrilldown({ userId, userName })}
                              >
                                {userName}
                              </button>
                              <p className="text-xs text-muted-foreground">{userAlerts[0]?.user_email} · {userAlerts.length} alert{userAlerts.length > 1 ? 's' : ''}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleFlagUser(userId)}>
                              <Flag className="h-3 w-3 mr-1" /> Flag
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {userAlerts.slice(0, 5).map(alert => (
                              <div key={alert.id} className="flex items-center gap-2 text-sm">
                                <div className={`w-1.5 h-1.5 rounded-full ${severityDot(alert.severity)}`} />
                                <span className="text-muted-foreground text-xs">{format(new Date(alert.created_at), 'HH:mm')}</span>
                                <span>{alert.action_label}</span>
                              </div>
                            ))}
                            {userAlerts.length > 5 && (
                              <p className="text-xs text-muted-foreground pl-4">+{userAlerts.length - 5} more...</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Activity Detail</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Timestamp</span><p className="font-mono">{format(new Date(selectedLog.created_at), 'PPpp')}</p></div>
                  <div><span className="text-muted-foreground">Severity</span><p><Badge className={severityColor(selectedLog.severity)}>{selectedLog.severity}</Badge></p></div>
                  <div><span className="text-muted-foreground">User</span><p>{selectedLog.user_name}</p></div>
                  <div><span className="text-muted-foreground">Email</span><p>{selectedLog.user_email}</p></div>
                  <div><span className="text-muted-foreground">Role</span><p>{selectedLog.user_role}</p></div>
                  <div><span className="text-muted-foreground">Plan</span><p>{selectedLog.user_plan}</p></div>
                  <div><span className="text-muted-foreground">Category</span><p>{selectedLog.action_category}</p></div>
                  <div><span className="text-muted-foreground">Action Type</span><p>{selectedLog.action_type}</p></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Action Label</span><p>{selectedLog.action_label}</p></div>
                  <div><span className="text-muted-foreground">Entity Type</span><p>{selectedLog.entity_type || '—'}</p></div>
                  <div><span className="text-muted-foreground">Entity ID</span><p className="font-mono text-xs break-all">{selectedLog.entity_id || '—'}</p></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Entity Label</span><p>{selectedLog.entity_label || '—'}</p></div>
                  <div><span className="text-muted-foreground">Device</span><p>{selectedLog.device_type || '—'}</p></div>
                  <div><span className="text-muted-foreground">IP</span><p>{selectedLog.ip_address || 'N/A (client-side)'}</p></div>
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground">User Agent</span>
                  <p className="text-xs font-mono break-all mt-1">{selectedLog.user_agent || '—'}</p>
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Metadata</span>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* User Drilldown Dialog */}
      <Dialog open={!!userDrilldown} onOpenChange={() => setUserDrilldown(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Activity: {userDrilldown?.userName}</span>
              {userDrilldown && (
                <Button variant="outline" size="sm" onClick={() => handleFlagUser(userDrilldown.userId)}>
                  <Flag className="h-3 w-3 mr-1" /> Flag User
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {userLogsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{userLogs.filter(l => l.action_type === 'login_success').length}</p>
                  <p className="text-xs text-muted-foreground">Logins</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{userLogs.filter(l => l.action_category === 'booking').length}</p>
                  <p className="text-xs text-muted-foreground">Bookings</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{userLogs.filter(l => l.action_category === 'payment').length}</p>
                  <p className="text-xs text-muted-foreground">Payments</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{userLogs.length > 0 ? format(new Date(userLogs[0].created_at), 'MMM dd') : '—'}</p>
                  <p className="text-xs text-muted-foreground">Last Seen</p>
                </CardContent></Card>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                {userLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${severityDot(log.severity)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.action_label}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'PPpp')} · {log.device_type}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${categoryBadge(log.action_category)}`}>
                      {log.action_category}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
