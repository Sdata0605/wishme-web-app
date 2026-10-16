import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, DollarSign, Eye, Send, Music, Download, Upload,
  Heart, Image as ImageIcon, Phone, Wand2, Video, Gift, Calendar, RefreshCw, 
  Megaphone, CheckCircle, Loader2, AlertTriangle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookingStatusBadge } from "@/components/booking/BookingStatusBadge";
import { Textarea } from "@/components/ui/textarea";
import BookingDetailsDialog from "@/components/admin/BookingDetailsDialog";
import { WishFriendOrderDialog } from "@/components/admin/WishFriendOrderDialog";
import { OrderDetailsList } from "@/components/admin/OrderDetailsList";
import { format } from "date-fns";

// Tab configuration - Approval required tabs first
const ORDER_TABS = [
  { id: "ugc-videos", label: "UGC Videos", icon: Megaphone, requiresApproval: true },
  { id: "wish-friend", label: "Wish a Friend", icon: Heart, requiresApproval: true },
  { id: "video-bookings", label: "Video Wishes", icon: Video, requiresApproval: true },
  { id: "ugc-ads", label: "UGC Ads", icon: Megaphone, requiresApproval: true },
  { id: "occasion-bookings", label: "Occasions", icon: Calendar, requiresApproval: true },
  // Generated instantly by the AI and paid on the spot: the admin only watches these, nothing to approve.
  { id: "image-promotions", label: "Image Promos", icon: ImageIcon, requiresApproval: false },
  { id: "wish-celebrity", label: "Wish Celebrity", icon: Heart, requiresApproval: false },
  { id: "greeting-cards", label: "Greeting Cards", icon: Gift, requiresApproval: false },
  { id: "celebrity-calls", label: "Celebrity Calls", icon: Phone, requiresApproval: false },
  { id: "photo-wishes", label: "Photo Wishes", icon: Wand2, requiresApproval: false },
  { id: "music-orders", label: "AI Music", icon: Music, requiresApproval: false },
];

const PAGE_SIZE = 50;

type TabDataState = {
  data: any[];
  loading: boolean;
  loaded: boolean;
  count: number;
};

export default function AdminBookings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("ugc-videos");
  const [selectedWishFriend, setSelectedWishFriend] = useState<any>(null);
  const [wishFriendDialogOpen, setWishFriendDialogOpen] = useState(false);
  
  // Lazy-loaded data per tab
  const [tabData, setTabData] = useState<Record<string, TabDataState>>(() => {
    const initial: Record<string, TabDataState> = {};
    ORDER_TABS.forEach(tab => {
      initial[tab.id] = { data: [], loading: false, loaded: false, count: 0 };
    });
    return initial;
  });
  
  // Stats loaded separately (quick counts only)
  const [stats, setStats] = useState<Record<string, number>>({});
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Dialog states
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testWebhookOpen, setTestWebhookOpen] = useState(false);
  const [testBookingId, setTestBookingId] = useState<string | null>(null);
  const [customWebhookUrl, setCustomWebhookUrl] = useState("https://n8n.srv1120492.hstgr.cloud/webhook/start1");
  const [testingWebhook, setTestingWebhook] = useState(false);
  
  // UGC Ads dialog state
  const [selectedUgcAd, setSelectedUgcAd] = useState<any>(null);
  const [ugcDialogOpen, setUgcDialogOpen] = useState(false);
  const [heygenVideoId, setHeygenVideoId] = useState("");
  const [processingUgc, setProcessingUgc] = useState(false);
  const [localVideoFile, setLocalVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const { toast } = useToast();

  // Fetch quick counts for all tabs (lightweight)
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [
        { count: videoCount },
        { count: wishCount },
        { count: greetingCount },
        { count: imageCount },
        { count: callCount },
        { count: photoCount },
        { count: musicCount },
        { count: occasionCount },
        { count: ugcCount },
        { count: wishFriendCount },
        { count: ugcVideoCount },
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('wish_celebrity_orders').select('*', { count: 'exact', head: true }),
        supabase.from('greeting_card_generations').select('*', { count: 'exact', head: true }),
        supabase.from('image_promotions').select('*', { count: 'exact', head: true }),
        supabase.from('voice_call_wishes').select('*', { count: 'exact', head: true }),
        supabase.from('photo_wishes').select('*', { count: 'exact', head: true }),
        supabase.from('music_generations').select('*', { count: 'exact', head: true }),
        supabase.from('occasion_bookings').select('*', { count: 'exact', head: true }),
        supabase.from('ugc_ads').select('*', { count: 'exact', head: true }),
        supabase.from('wish_friend_orders' as any).select('*', { count: 'exact', head: true }).eq('order_type', 'video_wish'),
        supabase.from('wish_friend_orders' as any).select('*', { count: 'exact', head: true }).eq('order_type', 'ugc_video'),
      ]);
      
      setStats({
        'video-bookings': videoCount || 0,
        'wish-celebrity': wishCount || 0,
        'greeting-cards': greetingCount || 0,
        'image-promotions': imageCount || 0,
        'celebrity-calls': callCount || 0,
        'photo-wishes': photoCount || 0,
        'music-orders': musicCount || 0,
        'occasion-bookings': occasionCount || 0,
        'ugc-ads': ugcCount || 0,
        'wish-friend': wishFriendCount || 0,
        'ugc-videos': ugcVideoCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch data for a specific tab
  const fetchTabData = useCallback(async (tabId: string, forceRefresh = false) => {
    const currentState = tabData[tabId];
    if (currentState.loaded && !forceRefresh) return;
    
    setTabData(prev => ({
      ...prev,
      [tabId]: { ...prev[tabId], loading: true }
    }));

    try {
      let result: { data: any[] | null; count: number | null } = { data: null, count: null };
      
      switch (tabId) {
        case 'wish-friend':
        case 'ugc-videos':
          result = await supabase
            .from('wish_friend_orders' as any)
            .select(`*, celebrities(name, image_url), profiles!wish_friend_orders_user_id_fkey(first_name, last_name, email)`, { count: 'exact' })
            .eq('order_type', tabId === 'ugc-videos' ? 'ugc_video' : 'video_wish')
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE) as any;
          break;
        case 'video-bookings':
          result = await supabase
            .from('bookings')
            .select(`*, celebrities(name, image_url), profiles!bookings_user_id_fkey(first_name, last_name, email)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);
          break;
        case 'wish-celebrity':
          result = await supabase
            .from('wish_celebrity_orders')
            .select(`*, celebrities(name, image_url), profiles!wish_celebrity_orders_user_id_fkey(first_name, last_name, email)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);
          break;
        case 'greeting-cards':
          result = await supabase
            .from('greeting_card_generations')
            .select(`*, profiles!greeting_card_generations_user_id_fkey(first_name, last_name, email)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);
          break;
        case 'image-promotions':
          result = await supabase
            .from('image_promotions')
            .select(`*, celebrities(name, image_url), profiles!image_promotions_user_id_fkey(first_name, last_name, email)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);
          break;
        case 'celebrity-calls':
          result = await supabase
            .from('voice_call_wishes')
            .select(`*, celebrities(name, image_url), profiles!voice_call_wishes_user_id_fkey(first_name, last_name, email)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);
          break;
        case 'photo-wishes':
          result = await supabase
            .from('photo_wishes')
            .select(`*, profiles!photo_wishes_user_id_fkey(first_name, last_name, email)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);
          break;
        case 'music-orders':
          result = await supabase
            .from('music_generations')
            .select(`*, profiles!music_generations_user_id_fkey(first_name, last_name, email)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);
          break;
        case 'occasion-bookings':
          result = await supabase
            .from('occasion_bookings')
            .select(`*, celebrities(name, image_url), occasions(name), profiles!occasion_bookings_user_id_fkey(first_name, last_name, email)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);
          break;
        case 'ugc-ads':
          result = await supabase
            .from('ugc_ads')
            .select(`*, celebrities(name, image_url)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);
          // ugc_ads.user_id references auth.users, not profiles — enrich with profile data
          if (result.data && result.data.length > 0) {
            const authUserIds = [...new Set(result.data.map((ad: any) => ad.user_id).filter(Boolean))];
            if (authUserIds.length > 0) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('user_id, first_name, last_name, email')
                .in('user_id', authUserIds);
              if (profilesData) {
                const profileMap = new Map(profilesData.map(p => [p.user_id, p]));
                result.data = result.data.map((ad: any) => ({
                  ...ad,
                  profiles: profileMap.get(ad.user_id) || null
                }));
              }
            }
          }
          break;
      }

      setTabData(prev => ({
        ...prev,
        [tabId]: { 
          data: result.data || [], 
          loading: false, 
          loaded: true,
          count: result.count || 0 
        }
      }));
    } catch (error) {
      console.error(`Error fetching ${tabId}:`, error);
      setTabData(prev => ({
        ...prev,
        [tabId]: { ...prev[tabId], loading: false }
      }));
    }
  }, [tabData]);

  // Initial load: stats + first tab + realtime subscription
  useEffect(() => {
    fetchStats();
    fetchTabData('ugc-videos');

    // Subscribe to booking updates for real-time status changes
    const channel = supabase
      .channel('admin_booking_updates')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        () => {
          fetchTabData(activeTab, true);
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load tab data when tab changes
  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleRefresh = () => {
    fetchTabData(activeTab, true);
    fetchStats();
  };

  const getStatusBadge = (status: string, item?: any) => {
    // For video bookings, check composite status
    if (item && activeTab === 'video-bookings') {
      if (item.generation_status === 'completed' && item.video_status === 'ready' && item.status !== 'sent') {
        return <Badge className="bg-purple-500 text-white">Ready to Send</Badge>;
      }
      if (item.status === 'sent') {
        return <Badge className="bg-green-500 text-white">Sent to Customer</Badge>;
      }
    }
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      sent: "bg-green-500 text-white",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      processing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    };
    return <Badge className={variants[status?.toLowerCase()] || "bg-gray-100 text-gray-800"}>{status || 'Unknown'}</Badge>;
  };

  const handleTestWebhook = async () => {
    if (!testBookingId) return;
    setTestingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-booking-status", {
        body: { bookingId: testBookingId, status: "confirmed", testMode: true, webhookUrl: customWebhookUrl }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Webhook test failed");
      toast({ title: "Webhook Test Successful", description: "Test webhook was sent successfully" });
      setTestWebhookOpen(false);
    } catch (error: any) {
      toast({ title: "Webhook Test Failed", description: error.message, variant: "destructive" });
    } finally {
      setTestingWebhook(false);
    }
  };

  // Handle UGC Ad video ID submission
  const handleProcessUgcVideo = async () => {
    if (!selectedUgcAd || !heygenVideoId.trim()) {
      toast({ title: "Missing Video ID", description: "Please enter the HeyGen video ID", variant: "destructive" });
      return;
    }

    setProcessingUgc(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-ugc-video-id', {
        body: {
          ugc_ad_id: selectedUgcAd.id,
          heygen_video_id: heygenVideoId.trim()
        }
      });

      if (error) throw error;

      if (data.status === 'completed') {
        toast({ 
          title: "Video Processed!", 
          description: "The UGC ad video has been delivered to the user." 
        });
        setUgcDialogOpen(false);
        setHeygenVideoId("");
        setSelectedUgcAd(null);
        fetchTabData('ugc-ads', true);
      } else if (data.status === 'processing') {
        toast({ 
          title: "Video Still Processing", 
          description: "The video is still being processed in HeyGen. Try again in a few minutes." 
        });
      } else {
        toast({ 
          title: "Processing Result", 
          description: data.message || "Check the order status for updates." 
        });
      }
    } catch (error: any) {
      toast({ 
        title: "Processing Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setProcessingUgc(false);
    }
  };

  // Handle local video upload for UGC ads
  const handleLocalVideoUpload = async () => {
    if (!selectedUgcAd || !localVideoFile) {
      toast({ title: "No Video Selected", description: "Please select a video file to upload", variant: "destructive" });
      return;
    }

    setUploadingVideo(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", localVideoFile);
      formData.append("ugc_ad_id", selectedUgcAd.id);

      const { data, error } = await supabase.functions.invoke('upload-ugc-video', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ 
          title: "Video Uploaded!", 
          description: "The UGC ad video has been uploaded and delivered to the user." 
        });
        setUgcDialogOpen(false);
        setLocalVideoFile(null);
        setHeygenVideoId("");
        setSelectedUgcAd(null);
        fetchTabData('ugc-ads', true);
      } else {
        throw new Error(data?.error || "Upload failed");
      }
    } catch (error: any) {
      toast({ 
        title: "Upload Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  // Parse UGC ad admin notes
  const parseAdminNotes = (notes: string) => {
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  };

  const getCustomerName = (item: any) => {
    if (item.profiles) {
      return `${item.profiles.first_name || ''} ${item.profiles.last_name || ''}`.trim() || item.profiles.email;
    }
    // Fallback for UGC ads that don't have profiles joined
    if (item.user_id) {
      return `User: ${item.user_id.substring(0, 8)}...`;
    }
    return 'Unknown';
  };

  const currentTabData = tabData[activeTab];
  
  const filteredItems = useMemo(() => {
    return currentTabData.data.filter(item => {
      const matchesSearch = !searchTerm || 
        item.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCustomerName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.wishme_payment_id && item.wishme_payment_id.toLowerCase().includes(searchTerm.toLowerCase()));
      let matchesStatus = statusFilter === "all" || item.status?.toLowerCase() === statusFilter.toLowerCase();
      // Custom filter for "ready_to_send"
      if (statusFilter === "ready_to_send") {
        matchesStatus = item.generation_status === 'completed' && item.video_status === 'ready' && item.status !== 'video_sent' && item.status !== 'sent' && item.status !== 'completed';
      }
      return matchesSearch && matchesStatus;
    });
  }, [currentTabData.data, searchTerm, statusFilter]);

  const totalOrders = Object.values(stats).reduce((a, b) => a + b, 0);

  const TableSkeleton = () => (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Booking Management</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage all orders across services.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={currentTabData.loading} className="self-start">
          <RefreshCw className={`w-4 h-4 mr-2 ${currentTabData.loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{totalOrders}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Video className="w-4 h-4" /> Video Wishes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{stats['video-bookings'] || 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <ImageIcon className="w-4 h-4" /> Image Promos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{stats['image-promotions'] || 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Music className="w-4 h-4" /> AI Music
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{stats['music-orders'] || 0}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by order ID, customer, or Payment ID (WM...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="processing">🛠 Processing</SelectItem>
                <SelectItem value="rejected">🚫 Rejected</SelectItem>
                <SelectItem value="confirmed">✅ Confirmed</SelectItem>
                <SelectItem value="ready_to_send">🎥 Video Ready</SelectItem>
                <SelectItem value="video_sent">📤 Video Sent</SelectItem>
                <SelectItem value="completed">✅ Completed</SelectItem>
                <SelectItem value="failed">⚠️ Failed</SelectItem>
                <SelectItem value="cancelled">❌ Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Order Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="w-full overflow-x-auto no-scrollbar scroll-touch">
          <TabsList className="inline-flex w-max gap-1 p-1">
            {ORDER_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 whitespace-nowrap">
                <tab.icon className="w-4 h-4" />
                <span className="text-xs sm:text-sm">{tab.label}</span>
                {tab.requiresApproval && <Badge variant="destructive" className="text-[10px] px-1">Approval</Badge>}
                <Badge variant="secondary" className="ml-1">
                  {statsLoading ? '...' : stats[tab.id] || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Wish a Friend tabs: video wishes and UGC videos (same table, split by order_type) */}
        {[
          { id: 'wish-friend', title: 'Wish a Friend: Video Wishes', hint: 'Video wish requests from Wish a Friend.' },
          { id: 'ugc-videos', title: 'UGC Videos', hint: 'UGC video requests from Wish a Friend. Check the format, style and reference photo.' },
        ].map((wfTab) => (
        <TabsContent key={wfTab.id} value={wfTab.id}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {wfTab.title} ({filteredItems.length})
                <Badge variant="destructive">Upload video to deliver</Badge>
              </CardTitle>
              <CardDescription>{wfTab.hint} Open one, upload the finished video, and it appears in the customer's My Orders.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTabData.loading ? <TableSkeleton /> : (
                <>
                  <div className="block sm:hidden space-y-3">
                    {filteredItems.map((order) => (
                      <div key={order.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{getCustomerName(order)}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {order.order_type === 'ugc_video' ? 'UGC Video' : 'Video Wish'} for {order.recipient_name} · {order.occasion}
                            </p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>{order.celebrities?.name || 'N/A'}</span>
                          <span className="font-semibold">₹{order.price_paid?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'PP')}</span>
                          <Button variant={order.status === 'completed' ? "outline" : "default"} size="sm" className="h-7 text-xs"
                            onClick={() => { setSelectedWishFriend(order); setWishFriendDialogOpen(true); }}>
                            <Eye className="w-3 h-3 mr-1" /> {order.status === 'pending' || order.status === 'processing' ? 'Process' : 'View'}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredItems.length === 0 && <div className="text-center text-muted-foreground py-8">No Wish a Friend orders found</div>}
                  </div>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>For / Occasion</TableHead>
                        <TableHead>Celebrity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">{order.id.substring(0, 8)}...</TableCell>
                          <TableCell>{getCustomerName(order)}</TableCell>
                          <TableCell><Badge variant="outline">{order.order_type === 'ugc_video' ? 'UGC Video' : 'Video Wish'}</Badge></TableCell>
                          <TableCell className="max-w-[180px] truncate">{order.recipient_name} · {order.occasion}</TableCell>
                          <TableCell>{order.celebrities?.name || 'N/A'}</TableCell>
                          <TableCell>₹{order.price_paid?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'PP')}</TableCell>
                          <TableCell>
                            <Button variant={order.status === 'completed' ? "outline" : "default"} size="sm"
                              onClick={() => { setSelectedWishFriend(order); setWishFriendDialogOpen(true); }}>
                              <Eye className="w-4 h-4 mr-1" /> {order.status === 'pending' || order.status === 'processing' ? 'Process' : 'View'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No Wish a Friend orders found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        ))}

        {/* Video Bookings Tab */}
        <TabsContent value="video-bookings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Video Wishes ({filteredItems.length})
                <Badge variant="destructive">Requires Approval</Badge>
              </CardTitle>
              <CardDescription>Celebrity video wish bookings - Admin approval required</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTabData.loading ? <TableSkeleton /> : (
                <>
                  {/* Mobile card view */}
                  <div className="block sm:hidden space-y-3">
                    {filteredItems.map((booking) => (
                      <div key={booking.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{getCustomerName(booking)}</p>
                            <p className="text-xs text-muted-foreground">{booking.celebrities?.name || 'N/A'}</p>
                          </div>
                          <BookingStatusBadge booking={booking} showSentTime showErrorTooltip />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono">{booking.id.substring(0, 8)}...</span>
                          <span className="font-semibold">₹{booking.final_price?.toLocaleString()}</span>
                        </div>
                        {booking.wishme_payment_id && (
                          <div className="text-[11px] font-mono text-emerald-500 font-semibold">{booking.wishme_payment_id}</div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{format(new Date(booking.created_at), 'PP')}</span>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedBookingId(booking.id); setDialogOpen(true); }}>
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredItems.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">No orders found</div>
                    )}
                  </div>
                  {/* Desktop table view */}
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Celebrity</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div className="font-mono text-sm">{booking.id.substring(0, 8)}...</div>
                            {booking.wishme_payment_id && (
                              <div className="text-[11px] font-mono text-emerald-500 font-semibold">{booking.wishme_payment_id}</div>
                            )}
                          </TableCell>
                          <TableCell>{getCustomerName(booking)}</TableCell>
                          <TableCell>{booking.celebrities?.name || 'N/A'}</TableCell>
                          <TableCell><Badge variant="outline">{booking.service_type}</Badge></TableCell>
                          <TableCell>₹{booking.final_price?.toLocaleString()}</TableCell>
                          <TableCell>
                            <BookingStatusBadge booking={booking} showSentTime showErrorTooltip />
                          </TableCell>
                          <TableCell>{format(new Date(booking.created_at), 'PP')}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => { setSelectedBookingId(booking.id); setDialogOpen(true); }}>
                                <Eye className="w-4 h-4 mr-1" /> View
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => { setTestBookingId(booking.id); setTestWebhookOpen(true); }}>
                                <Send className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* UGC Ads Tab */}
        <TabsContent value="ugc-ads">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                UGC Ads ({filteredItems.length})
                <Badge variant="destructive">Manual Processing</Badge>
              </CardTitle>
              <CardDescription>UGC video ad orders - Generate in HeyGen, then paste video ID here</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTabData.loading ? <TableSkeleton /> : (
                <>
                  <div className="block sm:hidden space-y-3">
                    {filteredItems.map((ad) => (
                      <div key={ad.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{getCustomerName(ad)}</p>
                            <p className="text-xs text-muted-foreground truncate">{ad.product_name}</p>
                          </div>
                          {getStatusBadge(ad.status)}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>{ad.celebrities?.name || 'Generic'}</span>
                          <span className="font-semibold">₹{ad.price_paid?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{format(new Date(ad.created_at), 'PP')}</span>
                          <Button variant={ad.status === 'completed' ? "outline" : "default"} size="sm" className="h-7 text-xs"
                            onClick={() => { setSelectedUgcAd(ad); setHeygenVideoId(ad.heygen_video_id || ""); setUgcDialogOpen(true); }}>
                            <Eye className="w-3 h-3 mr-1" /> {ad.status === 'completed' ? 'View' : 'Process'}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredItems.length === 0 && <div className="text-center text-muted-foreground py-8">No UGC ad orders found</div>}
                  </div>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Celebrity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((ad) => (
                        <TableRow key={ad.id}>
                          <TableCell className="font-mono text-sm">{ad.id.substring(0, 8)}...</TableCell>
                          <TableCell>{getCustomerName(ad)}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{ad.product_name}</TableCell>
                          <TableCell>{ad.celebrities?.name || 'Generic'}</TableCell>
                          <TableCell>₹{ad.price_paid?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(ad.status)}</TableCell>
                          <TableCell>{format(new Date(ad.created_at), 'PP')}</TableCell>
                          <TableCell>
                            <Button variant={ad.status === 'completed' ? "outline" : "default"} size="sm"
                              onClick={() => { setSelectedUgcAd(ad); setHeygenVideoId(ad.heygen_video_id || ""); setUgcDialogOpen(true); }}>
                              <Eye className="w-4 h-4 mr-1" /> {ad.status === 'completed' ? 'View' : 'Process'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No UGC ad orders found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Image Promotions Tab */}
        <TabsContent value="image-promotions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Image Promotions ({filteredItems.length})
                <Badge variant="secondary">Auto-generated</Badge>
              </CardTitle>
              <CardDescription>Images made by users with a celebrity. No approval needed: the price is charged and the celebrity's commission credited when the image is created.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTabData.loading ? <TableSkeleton /> : (
                <>
                  <div className="block sm:hidden space-y-3">
                    {filteredItems.map((promo) => (
                      <div key={promo.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{getCustomerName(promo)}</p>
                            <p className="text-xs text-muted-foreground">{promo.celebrities?.name || 'N/A'}</p>
                          </div>
                          {getStatusBadge(promo.status)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{promo.concept}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{format(new Date(promo.created_at), 'PP')} · <span className="font-semibold text-foreground">₹{promo.price_paid?.toLocaleString()}</span></span>
                          {promo.generated_image_url && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(promo.generated_image_url, '_blank')}>
                              <Eye className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredItems.length === 0 && <div className="text-center text-muted-foreground py-8">No orders found</div>}
                  </div>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Celebrity</TableHead>
                        <TableHead>Concept</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Image</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((promo) => (
                        <TableRow key={promo.id}>
                          <TableCell className="font-mono text-sm">{promo.id.substring(0, 8)}...</TableCell>
                          <TableCell>{getCustomerName(promo)}</TableCell>
                          <TableCell>{promo.celebrities?.name || 'N/A'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{promo.concept}</TableCell>
                          <TableCell className="font-semibold">₹{promo.price_paid?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(promo.status)}</TableCell>
                          <TableCell>{format(new Date(promo.created_at), 'PP')}</TableCell>
                          <TableCell>
                            {promo.generated_image_url && (
                              <button type="button" onClick={() => window.open(promo.generated_image_url, '_blank')} title="Open the generated image">
                                <img src={promo.generated_image_url} alt="Generated promotion" className="h-12 w-12 rounded object-cover border" loading="lazy" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occasion Bookings Tab */}
        <TabsContent value="occasion-bookings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Occasion Bookings ({filteredItems.length})
                <Badge variant="destructive">Requires Approval</Badge>
              </CardTitle>
              <CardDescription>Special occasion celebrity bookings - Admin approval required</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTabData.loading ? <TableSkeleton /> : (
                <>
                  <div className="block sm:hidden space-y-3">
                    {filteredItems.map((booking) => (
                      <div key={booking.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{getCustomerName(booking)}</p>
                            <p className="text-xs text-muted-foreground">{booking.celebrities?.name || 'N/A'}</p>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="secondary" className="text-[10px]">{booking.occasions?.name || booking.booking_type}</Badge>
                          <span className="font-semibold">₹{booking.price?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>To: {booking.recipient_name}</span>
                          <span>{format(new Date(booking.created_at), 'PP')}</span>
                        </div>
                      </div>
                    ))}
                    {filteredItems.length === 0 && <div className="text-center text-muted-foreground py-8">No orders found</div>}
                  </div>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Celebrity</TableHead>
                        <TableHead>Occasion</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-sm">{booking.id.substring(0, 8)}...</TableCell>
                          <TableCell>{getCustomerName(booking)}</TableCell>
                          <TableCell>{booking.celebrities?.name || 'N/A'}</TableCell>
                          <TableCell><Badge variant="secondary">{booking.occasions?.name || booking.booking_type}</Badge></TableCell>
                          <TableCell>{booking.recipient_name}</TableCell>
                          <TableCell>₹{booking.price?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          <TableCell>{format(new Date(booking.created_at), 'PP')}</TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wish Celebrity Tab - No approval needed */}
        <TabsContent value="wish-celebrity">
          <Card>
            <CardHeader>
              <CardTitle>Wish a Celebrity Orders ({filteredItems.length})</CardTitle>
              <CardDescription>Orders where users wish celebrities - Auto-processed</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTabData.loading ? <TableSkeleton /> : (
                <>
                  <div className="block sm:hidden space-y-3">
                    {filteredItems.map((order) => (
                      <div key={order.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{getCustomerName(order)}</p>
                            <p className="text-xs text-muted-foreground">{order.celebrities?.name || 'N/A'}</p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="secondary" className="text-[10px]">{order.occasion_type}</Badge>
                          <span className="font-semibold">₹{order.price?.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{order.message}</p>
                        <span className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'PP')}</span>
                      </div>
                    ))}
                    {filteredItems.length === 0 && <div className="text-center text-muted-foreground py-8">No orders found</div>}
                  </div>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Celebrity</TableHead>
                        <TableHead>Occasion</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">{order.id.substring(0, 8)}...</TableCell>
                          <TableCell>{getCustomerName(order)}</TableCell>
                          <TableCell>{order.celebrities?.name || 'N/A'}</TableCell>
                          <TableCell><Badge variant="secondary">{order.occasion_type}</Badge></TableCell>
                          <TableCell className="max-w-[200px] truncate">{order.message}</TableCell>
                          <TableCell>₹{order.price?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'PP')}</TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Greeting Cards Tab - No approval needed */}
        <TabsContent value="greeting-cards">
          <Card>
            <CardHeader>
              <CardTitle>Greeting Card Orders ({filteredItems.length})</CardTitle>
              <CardDescription>AI-generated greeting cards - Auto-processed</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTabData.loading ? <TableSkeleton /> : (
                <>
                  <div className="block sm:hidden space-y-3">
                    {filteredItems.map((card) => (
                      <div key={card.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{getCustomerName(card)}</p>
                            <Badge variant="secondary" className="text-[10px]">{card.occasion_name}</Badge>
                          </div>
                          {getStatusBadge(card.status)}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>To: {card.recipient_name || 'N/A'}</span>
                          <span>{format(new Date(card.created_at), 'PP')}</span>
                        </div>
                        {card.generated_image_url && (
                          <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => window.open(card.generated_image_url, '_blank')}>
                            <Eye className="w-3 h-3 mr-1" /> Preview
                          </Button>
                        )}
                      </div>
                    ))}
                    {filteredItems.length === 0 && <div className="text-center text-muted-foreground py-8">No orders found</div>}
                  </div>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Occasion</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Preview</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((card) => (
                        <TableRow key={card.id}>
                          <TableCell className="font-mono text-sm">{card.id.substring(0, 8)}...</TableCell>
                          <TableCell>{getCustomerName(card)}</TableCell>
                          <TableCell><Badge variant="secondary">{card.occasion_name}</Badge></TableCell>
                          <TableCell>{card.recipient_name || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(card.status)}</TableCell>
                          <TableCell>{format(new Date(card.created_at), 'PP')}</TableCell>
                          <TableCell>
                            {card.generated_image_url && (
                              <Button variant="outline" size="sm" onClick={() => window.open(card.generated_image_url, '_blank')}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No orders found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Celebrity Calls Tab - No approval needed */}
        <TabsContent value="celebrity-calls">
          <Card>
            <CardHeader>
              <CardTitle>Celebrity Call Orders ({filteredItems.length})</CardTitle>
              <CardDescription>Voice call wishes - Auto-processed</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTabData.loading ? <TableSkeleton /> : (
                <>
                  <div className="block sm:hidden space-y-3">
                    {filteredItems.map((call) => (
                      <div key={call.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{getCustomerName(call)}</p>
                            <p className="text-xs text-muted-foreground">{call.celebrities?.name || 'N/A'}</p>
                          </div>
                          {getStatusBadge(call.call_status)}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>To: {call.recipient_name}</span>
                          <span className="font-semibold">₹{call.price_paid?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px]">{call.occasion}</Badge>
                          <span>{format(new Date(call.created_at), 'PP')}</span>
                        </div>
                      </div>
                    ))}
                    {filteredItems.length === 0 && <div className="text-center text-muted-foreground py-8">No orders found</div>}
                  </div>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Celebrity</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Occasion</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell className="font-mono text-sm">{call.id.substring(0, 8)}...</TableCell>
                          <TableCell>{getCustomerName(call)}</TableCell>
                          <TableCell>{call.celebrities?.name || 'N/A'}</TableCell>
                          <TableCell>{call.recipient_name}</TableCell>
                          <TableCell><Badge variant="secondary">{call.occasion}</Badge></TableCell>
                          <TableCell>₹{call.price_paid?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(call.call_status)}</TableCell>
                          <TableCell>{format(new Date(call.created_at), 'PP')}</TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photo Wishes Tab - No approval needed */}
        <TabsContent value="photo-wishes">
          <Card>
            <CardHeader>
              <CardTitle>Photo Wish Orders ({filteredItems.length})</CardTitle>
              <CardDescription>AI-enhanced photo wishes - Auto-processed</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTabData.loading ? <TableSkeleton /> : (
                <>
                  <div className="block sm:hidden space-y-3">
                    {filteredItems.map((wish) => (
                      <div key={wish.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm truncate flex-1 min-w-0">{getCustomerName(wish)}</p>
                          {getStatusBadge(wish.status)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{wish.wish_text}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{format(new Date(wish.created_at), 'PP')}</span>
                          <span className="font-semibold">₹{wish.amount_charged?.toLocaleString()}</span>
                        </div>
                        {wish.generated_image_url && (
                          <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => window.open(wish.generated_image_url, '_blank')}>
                            <Eye className="w-3 h-3 mr-1" /> View Image
                          </Button>
                        )}
                      </div>
                    ))}
                    {filteredItems.length === 0 && <div className="text-center text-muted-foreground py-8">No orders found</div>}
                  </div>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Wish Text</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Image</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((wish) => (
                        <TableRow key={wish.id}>
                          <TableCell className="font-mono text-sm">{wish.id.substring(0, 8)}...</TableCell>
                          <TableCell>{getCustomerName(wish)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{wish.wish_text}</TableCell>
                          <TableCell>₹{wish.amount_charged?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(wish.status)}</TableCell>
                          <TableCell>{format(new Date(wish.created_at), 'PP')}</TableCell>
                          <TableCell>
                            {wish.generated_image_url && (
                              <Button variant="outline" size="sm" onClick={() => window.open(wish.generated_image_url, '_blank')}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No orders found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Music Orders Tab - No approval needed */}
        <TabsContent value="music-orders">
          <Card>
            <CardHeader>
              <CardTitle>AI Music Orders ({filteredItems.length})</CardTitle>
              <CardDescription>AI-generated music - Auto-processed</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTabData.loading ? <TableSkeleton /> : (
                <>
                  <div className="block sm:hidden space-y-3">
                    {filteredItems.map((music) => (
                      <div key={music.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{getCustomerName(music)}</p>
                            <p className="text-xs text-muted-foreground truncate">{music.song_title}</p>
                          </div>
                          {getStatusBadge(music.status)}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex gap-1">
                            {music.genre && <Badge variant="outline" className="text-[10px]">{music.genre}</Badge>}
                            {music.mood && <Badge variant="secondary" className="text-[10px]">{music.mood}</Badge>}
                          </div>
                          <span className="font-semibold">₹{music.credits_used?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{format(new Date(music.created_at), 'PP')}</span>
                          {music.status === 'completed' && music.download_url && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(music.download_url, '_blank')}>
                              <Download className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredItems.length === 0 && <div className="text-center text-muted-foreground py-8">No orders found</div>}
                  </div>
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Song Title</TableHead>
                        <TableHead>Genre/Mood</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((music) => (
                        <TableRow key={music.id}>
                          <TableCell className="font-mono text-sm">{music.id.substring(0, 8)}...</TableCell>
                          <TableCell>{getCustomerName(music)}</TableCell>
                          <TableCell>{music.song_title}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {music.genre && <Badge variant="outline">{music.genre}</Badge>}
                              {music.mood && <Badge variant="secondary">{music.mood}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>₹{music.credits_used?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(music.status)}</TableCell>
                          <TableCell>{format(new Date(music.created_at), 'PP')}</TableCell>
                          <TableCell>
                            {music.status === 'completed' && music.download_url && (
                              <Button variant="outline" size="sm" onClick={() => window.open(music.download_url, '_blank')}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking Details Dialog */}
      <BookingDetailsDialog
        bookingId={selectedBookingId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={() => fetchTabData('video-bookings', true)}
      />

      {/* Test Webhook Dialog */}
      <Dialog open={testWebhookOpen} onOpenChange={setTestWebhookOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Webhook</DialogTitle>
            <DialogDescription>Send a test webhook request to verify workflow integration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Booking ID</Label>
              <Input value={testBookingId || ""} disabled className="font-mono" />
            </div>
            <div>
              <Label>Webhook URL</Label>
              <Input value={customWebhookUrl} onChange={(e) => setCustomWebhookUrl(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleTestWebhook} disabled={testingWebhook || !testBookingId} className="flex-1">
                <Send className="w-4 h-4 mr-2" />
                {testingWebhook ? "Sending..." : "Send Test Webhook"}
              </Button>
              <Button variant="outline" onClick={() => setTestWebhookOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WishFriendOrderDialog
        order={selectedWishFriend}
        open={wishFriendDialogOpen}
        onOpenChange={setWishFriendDialogOpen}
        customerName={selectedWishFriend ? getCustomerName(selectedWishFriend) : ''}
        onChanged={() => { fetchTabData(activeTab, true); fetchStats(); }}
      />

      {/* UGC Ad Processing Dialog */}
      <Dialog open={ugcDialogOpen} onOpenChange={setUgcDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>UGC Ad Order Details</DialogTitle>
            <DialogDescription>
              Review order details, generate video in HeyGen, then paste the video ID here
            </DialogDescription>
          </DialogHeader>
          
          {selectedUgcAd && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-mono text-sm">{selectedUgcAd.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedUgcAd.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p>{getCustomerName(selectedUgcAd)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount Paid</Label>
                  <p className="font-semibold">₹{selectedUgcAd.price_paid?.toLocaleString()}</p>
                </div>
              </div>

              {/* Product Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Product Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-4">
                    {selectedUgcAd.product_image_url && (
                      <img 
                        src={selectedUgcAd.product_image_url} 
                        alt="Product"
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold">{selectedUgcAd.product_name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedUgcAd.product_description || 'No description'}</p>
                    </div>
                  </div>
                  
                  {(() => {
                    const notes = parseAdminNotes(selectedUgcAd.admin_notes);
                    if (!notes) return null;
                    return (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Hook Style:</span>
                            <span className="ml-2 font-medium">{notes.hook_style}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Aspect Ratio:</span>
                            <span className="ml-2 font-medium">{notes.aspect_ratio}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CTA:</span>
                            <span className="ml-2 font-medium">{notes.call_to_action}</span>
                          </div>
                          {notes.celebrity_name && (
                            <div>
                              <span className="text-muted-foreground">Celebrity:</span>
                              <span className="ml-2 font-medium">{notes.celebrity_name}</span>
                            </div>
                          )}
                        </div>
                        {notes.prompt && (
                          <div>
                            <Label className="text-muted-foreground">Additional Instructions</Label>
                            <p className="text-sm bg-muted p-2 rounded">{notes.prompt}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          <div>Avatar ID: <code>{notes.suggested_avatar_id}</code></div>
                          <div>Voice ID: <code>{notes.suggested_voice_id?.substring(0, 12)}...</code></div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <OrderDetailsList details={selectedUgcAd.order_details} />

              {/* Video Status / Input */}
              <Card className={selectedUgcAd.status === 'completed' ? 'border-green-500' : 'border-amber-500'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {selectedUgcAd.status === 'completed' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Video Delivered
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4 text-amber-500" />
                        Process Video
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedUgcAd.status === 'completed' && selectedUgcAd.video_url ? (
                    <div className="space-y-3">
                      <video 
                        src={selectedUgcAd.video_url} 
                        controls 
                        className="w-full max-h-64 rounded-lg bg-black"
                      />
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(selectedUgcAd.video_url, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Video
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg text-sm space-y-2">
                        <p className="font-medium text-amber-800 dark:text-amber-200">Option 1: HeyGen Video ID</p>
                        <ol className="list-decimal list-inside text-amber-700 dark:text-amber-300 space-y-1 text-xs">
                          <li>Generate video in HeyGen dashboard</li>
                          <li>Copy the video ID and paste below</li>
                        </ol>
                      </div>
                      
                      <div>
                        <Label>HeyGen Video ID</Label>
                        <Input 
                          value={heygenVideoId}
                          onChange={(e) => setHeygenVideoId(e.target.value)}
                          placeholder="e.g., abc123-def456-ghi789"
                          className="font-mono"
                          disabled={!!localVideoFile}
                        />
                      </div>
                      
                      <Button 
                        onClick={handleProcessUgcVideo}
                        disabled={processingUgc || !heygenVideoId.trim() || !!localVideoFile}
                        className="w-full"
                        variant="outline"
                      >
                        {processingUgc ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Fetch & Deliver from HeyGen
                          </>
                        )}
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or</span>
                        </div>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg space-y-3">
                        <p className="font-medium text-sm">Option 2: Upload Local Video</p>
                        <p className="text-xs text-muted-foreground">
                          Upload a video file directly (MP4, MOV, MKV, WebM, AVI)
                        </p>
                        
                        <div>
                          <Label htmlFor="ugc-video-upload">Select Video File</Label>
                          <Input 
                            id="ugc-video-upload"
                            type="file"
                            accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/avi,.mp4,.mov,.mkv,.webm,.avi"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setLocalVideoFile(file);
                                setHeygenVideoId(""); // Clear HeyGen ID when file selected
                              }
                            }}
                            disabled={uploadingVideo}
                          />
                          {localVideoFile && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Selected: {localVideoFile.name} ({(localVideoFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          )}
                        </div>

                        <Button 
                          onClick={handleLocalVideoUpload}
                          disabled={uploadingVideo || !localVideoFile}
                          className="w-full"
                        >
                          {uploadingVideo ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload & Deliver Video
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
