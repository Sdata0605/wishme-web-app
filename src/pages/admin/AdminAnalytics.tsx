import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, Users, DollarSign, Star, Calendar, Activity, Music, Image, Phone, Gift, Heart, Wallet, BarChart3, PieChart as PieChartIcon, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Button } from "@/components/ui/button";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";

const CHART_COLORS = [
  "hsl(16, 100%, 60%)", "hsl(280, 90%, 65%)", "hsl(142, 71%, 45%)",
  "hsl(207, 90%, 61%)", "hsl(38, 92%, 55%)", "hsl(334, 84%, 60%)",
  "hsl(162, 73%, 46%)", "hsl(250, 65%, 65%)"
];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUsersMonth, setNewUsersMonth] = useState(0);
  const [newUsersWeek, setNewUsersWeek] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [bookingsMonth, setBookingsMonth] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [completedBookings, setCompletedBookings] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const [revenueWeek, setRevenueWeek] = useState(0);
  const [totalCelebrities, setTotalCelebrities] = useState(0);
  const [activeCelebrities, setActiveCelebrities] = useState(0);
  const [avgBookingValue, setAvgBookingValue] = useState(0);
  const [totalMusicGen, setTotalMusicGen] = useState(0);
  const [totalGreetingCards, setTotalGreetingCards] = useState(0);
  const [totalVoiceCalls, setTotalVoiceCalls] = useState(0);
  const [totalPhotoWishes, setTotalPhotoWishes] = useState(0);
  const [totalWalletBalance, setTotalWalletBalance] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);

  // Chart data
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [topCelebrities, setTopCelebrities] = useState<any[]>([]);
  const [prevMonthUsers, setPrevMonthUsers] = useState(0);
  const [prevMonthRevenue, setPrevMonthRevenue] = useState(0);
  const [prevMonthBookings, setPrevMonthBookings] = useState(0);

  const fetchAll = async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const weekStart = subDays(now, 7).toISOString();
      const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
      const prevMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

      const [
        { count: uTotal }, { count: uMonth }, { count: uWeek },
        { data: allBookings }, { data: monthBookings }, { data: prevMBookings },
        { count: bPending }, { count: bCompleted },
        { count: cTotal }, { count: cActive },
        { count: musicCount }, { count: cardCount }, { count: callCount }, { count: photoCount },
        { data: walletData }, { data: commData },
        { count: prevMUsers },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('bookings').select('final_price, service_type, created_at, status'),
        supabase.from('bookings').select('final_price').gte('created_at', monthStart),
        supabase.from('bookings').select('final_price').gte('created_at', prevMonthStart).lt('created_at', prevMonthEnd),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('celebrities').select('*', { count: 'exact', head: true }),
        supabase.from('celebrities').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('music_generations').select('*', { count: 'exact', head: true }),
        supabase.from('greeting_card_generations').select('*', { count: 'exact', head: true }),
        supabase.from('voice_call_wishes').select('*', { count: 'exact', head: true }),
        supabase.from('photo_wishes').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('wallet_balance'),
        supabase.from('celebrity_wallet_transactions').select('amount').eq('transaction_type', 'commission'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', prevMonthStart).lt('created_at', prevMonthEnd),
      ]);

      setTotalUsers(uTotal || 0);
      setNewUsersMonth(uMonth || 0);
      setNewUsersWeek(uWeek || 0);
      setPrevMonthUsers(prevMUsers || 0);

      const allB = allBookings || [];
      const revTotal = allB.reduce((s, b) => s + (b.final_price || 0), 0);
      const revMonth = (monthBookings || []).reduce((s, b) => s + (b.final_price || 0), 0);
      const revWeek = allB.filter(b => new Date(b.created_at) >= new Date(weekStart)).reduce((s, b) => s + (b.final_price || 0), 0);
      const prevMRev = (prevMBookings || []).reduce((s, b) => s + (b.final_price || 0), 0);

      setTotalBookings(allB.length);
      setBookingsMonth((monthBookings || []).length);
      setPendingBookings(bPending || 0);
      setCompletedBookings(bCompleted || 0);
      setTotalRevenue(revTotal);
      setRevenueMonth(revMonth);
      setRevenueWeek(revWeek);
      setPrevMonthRevenue(prevMRev);
      setPrevMonthBookings((prevMBookings || []).length);
      setAvgBookingValue(allB.length > 0 ? Math.round(revTotal / allB.length) : 0);

      setTotalCelebrities(cTotal || 0);
      setActiveCelebrities(cActive || 0);
      setTotalMusicGen(musicCount || 0);
      setTotalGreetingCards(cardCount || 0);
      setTotalVoiceCalls(callCount || 0);
      setTotalPhotoWishes(photoCount || 0);

      const wBal = (walletData || []).reduce((s, u) => s + (u.wallet_balance || 0), 0);
      setTotalWalletBalance(wBal);
      const commTotal = (commData || []).reduce((s, c) => s + (c.amount || 0), 0);
      setTotalCommissions(commTotal);

      // Service breakdown
      const svc: Record<string, { count: number; revenue: number }> = {};
      allB.forEach(b => {
        const key = b.service_type || 'unknown';
        if (!svc[key]) svc[key] = { count: 0, revenue: 0 };
        svc[key].count++;
        svc[key].revenue += b.final_price || 0;
      });
      setServiceData(Object.entries(svc).map(([name, v]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: v.count, revenue: v.revenue
      })).sort((a, b) => b.count - a.count));

      // Monthly revenue (last 6 months)
      const months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const mStart = startOfMonth(d);
        const mEnd = endOfMonth(d);
        const mRev = allB.filter(b => {
          const t = new Date(b.created_at);
          return t >= mStart && t <= mEnd;
        }).reduce((s, b) => s + (b.final_price || 0), 0);
        const mCount = allB.filter(b => {
          const t = new Date(b.created_at);
          return t >= mStart && t <= mEnd;
        }).length;
        months.push({ month: format(d, 'MMM'), revenue: mRev, bookings: mCount });
      }
      setMonthlyRevenue(months);

      // User growth (last 6 months) - approximate from profiles
      const { data: profileDates } = await supabase.from('profiles').select('created_at').order('created_at');
      const ugMonths: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const mStart = startOfMonth(d);
        const mEnd = endOfMonth(d);
        const cnt = (profileDates || []).filter(p => {
          const t = new Date(p.created_at);
          return t >= mStart && t <= mEnd;
        }).length;
        ugMonths.push({ month: format(d, 'MMM'), users: cnt });
      }
      setUserGrowth(ugMonths);

      // Top celebrities
      const celebBookings: Record<string, number> = {};
      allB.forEach(b => {
        // We don't have celebrity name here, use celebrity_id
      });
      const { data: topCeleb } = await supabase
        .from('celebrities')
        .select('name, total_earnings, rating, review_count')
        .order('total_earnings', { ascending: false })
        .limit(5);
      setTopCelebrities(topCeleb || []);

    } catch (error: any) {
      toast({ title: "Error", description: "Could not load analytics", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const growth = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev * 100);
  };

  const GrowthLabel = ({ value }: { value: number }) => (
    <span className={`inline-flex items-center text-xs ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
      <TrendingUp className="w-3 h-3 mr-0.5" />
      {value.toFixed(1)}% vs last month
    </span>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl md:text-3xl font-bold">Analytics Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Comprehensive platform insights</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); fetchAll(); }} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Users</span>
            </div>
            <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">+{newUsersMonth} this month</p>
            <GrowthLabel value={growth(newUsersMonth, prevMonthUsers)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">₹{revenueMonth.toLocaleString()} this month</p>
            <GrowthLabel value={growth(revenueMonth, prevMonthRevenue)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Bookings</span>
            </div>
            <p className="text-2xl font-bold">{totalBookings}</p>
            <p className="text-xs text-muted-foreground">{bookingsMonth} this month</p>
            <GrowthLabel value={growth(bookingsMonth, prevMonthBookings)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Celebrities</span>
            </div>
            <p className="text-2xl font-bold">{totalCelebrities}</p>
            <p className="text-xs text-muted-foreground">{activeCelebrities} active</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Avg Booking Value</p>
            <p className="text-xl font-bold">₹{avgBookingValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Pending Orders</p>
            <p className="text-xl font-bold">{pendingBookings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Wallet</p>
            <p className="text-xl font-bold">₹{totalWalletBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Commissions Paid</p>
            <p className="text-xl font-bold">₹{totalCommissions.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="hsl(16, 100%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="w-4 h-4" /> User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="hsl(280, 90%, 65%)" fill="hsl(280, 90%, 65%)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Service Breakdown Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" /> Service Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={serviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="count" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {serviceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Orders']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">No booking data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Bookings Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Activity className="w-4 h-4" /> Booking Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="bookings" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Services Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">AI Services Overview</CardTitle>
          <CardDescription>Usage across all AI-powered services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="p-3 sm:p-4 rounded-xl bg-muted/50 border">
              <Music className="w-5 h-5 text-primary mb-2" />
              <p className="text-xl sm:text-2xl font-bold">{totalMusicGen}</p>
              <p className="text-xs text-muted-foreground">AI Music</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-muted/50 border">
              <Gift className="w-5 h-5 text-primary mb-2" />
              <p className="text-xl sm:text-2xl font-bold">{totalGreetingCards}</p>
              <p className="text-xs text-muted-foreground">Greeting Cards</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-muted/50 border">
              <Phone className="w-5 h-5 text-primary mb-2" />
              <p className="text-xl sm:text-2xl font-bold">{totalVoiceCalls}</p>
              <p className="text-xs text-muted-foreground">Voice Calls</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-muted/50 border">
              <Image className="w-5 h-5 text-primary mb-2" />
              <p className="text-xl sm:text-2xl font-bold">{totalPhotoWishes}</p>
              <p className="text-xs text-muted-foreground">Photo Wishes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Celebrities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Star className="w-4 h-4" /> Top Earning Celebrities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCelebrities.map((celeb, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">{i + 1}</div>
                  <div>
                    <p className="font-medium text-sm">{celeb.name}</p>
                    <p className="text-xs text-muted-foreground">⭐ {celeb.rating?.toFixed(1) || 'N/A'} ({celeb.review_count || 0} reviews)</p>
                  </div>
                </div>
                <p className="font-bold text-sm">₹{(celeb.total_earnings || 0).toLocaleString()}</p>
              </div>
            ))}
            {topCelebrities.length === 0 && <p className="text-center text-muted-foreground py-4">No celebrity data yet</p>}
          </div>
        </CardContent>
      </Card>

      {/* Service Revenue Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Revenue by Service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {serviceData.map((svc, i) => (
              <div key={svc.name} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <div>
                    <p className="font-medium text-sm">{svc.name}</p>
                    <p className="text-xs text-muted-foreground">{svc.count} orders</p>
                  </div>
                </div>
                <p className="font-bold text-sm">₹{svc.revenue.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
