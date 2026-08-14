import { useState, useEffect, useCallback, useRef, useMemo } from "react"; // refreshed
import { Link } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { B2VideoPlayer } from "@/components/media/B2VideoPlayer";
import { ImagePreviewModal } from "@/components/media/ImagePreviewModal";
import { 
  Star, Clock, CheckCircle, XCircle, Video, Music, Gift, Calendar,
  Heart, ImageIcon, Download, Phone, CalendarClock, Volume2, Wand2, Mic, FileAudio
} from "lucide-react";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 20;

const TAB_KEYS = [
  'celebrity', 'wishes', 'greeting', 'photo', 'calls',
  'music', 'image-music', 'tts', 'sfx', 'convert', 'isolate', 'occasion'
] as const;
type TabKey = typeof TAB_KEYS[number];

// Helper function to parse booking message JSON
const parseBookingMessage = (message: string) => {
  try {
    const parsed = JSON.parse(message);
    const requestDetails = parsed.requestDetails || parsed.step1 || {};
    const creativeGuidelines = parsed.creativeGuidelines || parsed.step3 || {};
    const scriptBuilder = parsed.scriptBuilder || parsed.step4 || {};
    return {
      recipientName: requestDetails.recipientName || '',
      occasion: requestDetails.occasion || '',
      message: requestDetails.message || '',
      toneAndStyle: creativeGuidelines.toneAndStyle || creativeGuidelines.tone || '',
      goal: creativeGuidelines.goal || '',
      script: scriptBuilder.talkingPoints || scriptBuilder.exactScript || scriptBuilder.generatedScript || scriptBuilder.scriptText || ''
    };
  } catch {
    return { message };
  }
};

export default function Bookings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('celebrity');
  const [tabData, setTabData] = useState<Record<string, any[]>>({});
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const loadedTabs = useRef<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);

  // Fetch lightweight counts for all tabs (head-only, no data)
  const fetchAllCounts = useCallback(async () => {
    if (!profile?.id) return;
    const countQueries = [
      { key: 'celebrity', table: 'bookings' as const },
      { key: 'wishes', table: 'wish_celebrity_orders' as const },
      { key: 'greeting', table: 'greeting_card_generations' as const },
      { key: 'photo', table: 'photo_wishes' as const },
      { key: 'calls', table: 'voice_call_wishes' as const },
      { key: 'music', table: 'music_generations' as const },
      { key: 'image-music', table: 'image_music_generations' as const },
      { key: 'tts', table: 'tts_generations' as const },
      { key: 'sfx', table: 'sound_effect_generations' as const },
      { key: 'convert', table: 'voice_conversion_generations' as const },
      { key: 'isolate', table: 'audio_isolation_generations' as const },
      { key: 'occasion', table: 'occasion_bookings' as const },
    ];

    const results = await Promise.all(
      countQueries.map(({ table }) =>
        supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', profile.id)
      )
    );

    const counts: Record<string, number> = {};
    countQueries.forEach((q, i) => {
      counts[q.key] = results[i].count || 0;
    });
    setTabCounts(counts);
  }, [profile?.id]);

  // Fetch data for a specific tab with selective columns
  const fetchTabData = useCallback(async (tab: TabKey, force = false) => {
    if (!profile?.id) return;
    if (!force && loadedTabs.current.has(tab)) return;

    setTabLoading(prev => ({ ...prev, [tab]: true }));

    try {
      let result: any;
      switch (tab) {
        case 'celebrity':
          result = await supabase.from('bookings')
            .select('id, status, service_type, created_at, message, final_price, video_url, video_file_key, generation_status, video_status, video_sent_at, celebrities:celebrity_id (name, image_url, category)')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'wishes':
          result = await supabase.from('wish_celebrity_orders')
            .select('id, status, occasion_type, recipient_name, message, amount_paid, created_at, generated_card_image_url, card_url, celebrities:celebrity_id (name, image_url)')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'greeting':
          result = await supabase.from('greeting_card_generations')
            .select('id, status, occasion_name, recipient_name, original_prompt, generated_image_url, created_at, amount_charged')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'photo':
          result = await supabase.from('photo_wishes')
            .select('id, status, occasion_type, recipient_name, message, output_url, created_at, credits_used')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'calls':
          result = await supabase.from('voice_call_wishes')
            .select('id, call_status, occasion, recipient_name, recipient_phone, sender_name, price_paid, created_at, scheduled_at, call_duration_seconds, vapi_voice_name, celebrities:celebrity_id (name, image_url)')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'music':
          result = await supabase.from('music_generations')
            .select('id, status, song_title, genre, mood, audio_url, created_at, credits_used, has_vocals, lyrics')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'image-music':
          result = await supabase.from('image_music_generations')
            .select('id, status, genre, mood, description, image_url, audio_url, created_at, amount_charged, has_vocals')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'tts':
          result = await supabase.from('tts_generations')
            .select('id, status, text, voice_name, audio_url, created_at, credits_used')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'sfx':
          result = await supabase.from('sound_effect_generations')
            .select('id, status, description, duration_seconds, audio_url, created_at, credits_used')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'convert':
          result = await supabase.from('voice_conversion_generations')
            .select('id, status, target_voice_name, original_file_name, audio_url, created_at, credits_used')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'isolate':
          result = await supabase.from('audio_isolation_generations')
            .select('id, status, original_file_name, audio_url, created_at, credits_used')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
        case 'occasion':
          result = await supabase.from('occasion_bookings')
            .select('id, status, recipient_name, message, price, created_at, celebrities:celebrity_id (name, image_url), occasions:occasion_id (name)')
            .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(ITEMS_PER_PAGE);
          break;
      }

      if (result?.error) throw result.error;
      setTabData(prev => ({ ...prev, [tab]: result.data || [] }));
      loadedTabs.current.add(tab);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setTabLoading(prev => ({ ...prev, [tab]: false }));
    }
  }, [profile?.id, toast]);

  // Initial load: counts + first tab
  useEffect(() => {
    if (!profile?.id) return;
    const init = async () => {
      await Promise.all([fetchAllCounts(), fetchTabData('celebrity')]);
      setInitialLoading(false);
    };
    init();
  }, [profile?.id, fetchAllCounts, fetchTabData]);

  // Realtime: targeted refetch
  useEffect(() => {
    if (!profile?.id) return;

    const bookingChannel = supabase
      .channel(`booking_updates_${profile.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `user_id=eq.${profile.id}` },
        () => {
          loadedTabs.current.delete('celebrity');
          if (activeTab === 'celebrity') fetchTabData('celebrity', true);
          fetchAllCounts();
        }
      ).subscribe();

    const musicChannel = supabase
      .channel(`music_updates_${profile.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'music_generations', filter: `user_id=eq.${profile.id}` },
        () => {
          loadedTabs.current.delete('music');
          if (activeTab === 'music') fetchTabData('music', true);
          fetchAllCounts();
        }
      ).subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(musicChannel);
    };
  }, [profile?.id, activeTab, fetchTabData, fetchAllCounts]);

  // Lazy load tab data on tab change
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as TabKey);
    fetchTabData(tab as TabKey);
  }, [fetchTabData]);

  const getCount = (tab: string) => tabCounts[tab] ?? (tabData[tab]?.length ?? 0);
  const getData = (tab: string): any[] => tabData[tab] || [];
  const isTabLoading = (tab: string) => tabLoading[tab] && !tabData[tab]?.length;

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'rejected': case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getBookingDisplayStatus = useMemo(() => (booking: any) => {
    const status = booking.status;
    const genStatus = booking.generation_status;
    const vidStatus = booking.video_status;
    if (status === 'cancelled') return { label: '❌ Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', pulse: false };
    if (vidStatus === 'failed' || genStatus === 'failed') return { label: '⚠️ Failed', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', pulse: false };
    if (genStatus === 'timeout' || vidStatus === 'timeout') return { label: '⚠️ Timed Out', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', pulse: false };
    if (status === 'completed') return { label: '✅ Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', pulse: false };
    if (status === 'video_sent' || status === 'sent') return { label: '📤 Delivered to You', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', pulse: false };
    if (genStatus === 'completed' && vidStatus === 'ready') return { label: '🎥 Video Ready — Pending Admin Review', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', pulse: false };
    if (genStatus === 'uploading') return { label: '⬆️ Uploading Video', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', pulse: true };
    if (genStatus === 'downloading') return { label: '⬇️ Processing Video', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', pulse: true };
    if (genStatus === 'video_generating') return { label: '🎬 Creating Video...', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', pulse: true };
    if (genStatus === 'script_generating') return { label: '🤖 Writing Script...', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', pulse: true };
    if (status === 'confirmed') return { label: '✅ Confirmed — In Queue', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', pulse: false };
    if (status === 'pending') return { label: '⏳ Awaiting Confirmation', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', pulse: false };
    return { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', pulse: false };
  }, []);

  const getCompositeStatusBadge = (booking: any) => {
    const { label, color, pulse } = getBookingDisplayStatus(booking);
    return (
      <Badge className={`${color} flex items-center gap-1.5`}>
        {pulse && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span></span>}
        {label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: any = { completed: "default", pending: "secondary", rejected: "destructive", failed: "destructive", processing: "secondary" };
    return <Badge variant={variants[status?.toLowerCase()] || "secondary"}>{status}</Badge>;
  };

  const getTimelineStage = useMemo(() => (booking: any) => {
    const status = booking.status;
    const genStatus = booking.generation_status;
    const vidStatus = booking.video_status;
    const isFailed = vidStatus === 'failed' || genStatus === 'failed' || genStatus === 'timeout';
    return [
      { label: 'Booking Placed', completed: true, failed: false },
      { label: 'Confirmed by Team', completed: status !== 'pending', failed: false },
      { label: 'Script Generated', completed: ['video_generating', 'downloading', 'uploading', 'completed'].includes(genStatus), failed: genStatus === 'failed' && !['video_generating', 'downloading', 'uploading', 'completed'].includes(genStatus) },
      { label: 'Video Being Created', completed: ['downloading', 'uploading', 'completed'].includes(genStatus), failed: genStatus === 'failed' },
      { label: 'Video Ready', completed: vidStatus === 'ready', failed: isFailed && vidStatus !== 'ready' },
      { label: 'Delivered ✓', completed: status === 'video_sent' || status === 'sent' || status === 'completed', failed: false },
    ];
  }, []);

  const getServiceTypeLabel = (type: string) => {
    const labels: any = { video_wish: "Video Wish", image_promotion: "Image Promotion", video_promotion: "Video Promotion", general_wish: "General Wish", text_message: "Text Message" };
    return labels[type] || type;
  };

  // Tab loading spinner
  const TabSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (initialLoading) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  const tabConfig: { key: TabKey; label: string; mobileLabel: string }[] = [
    { key: 'celebrity', label: 'Celebrity', mobileLabel: 'Celebrity' },
    { key: 'wishes', label: 'Wishes', mobileLabel: 'Wishes' },
    { key: 'greeting', label: 'Cards', mobileLabel: 'Cards' },
    { key: 'photo', label: 'Photo', mobileLabel: 'Photo' },
    { key: 'calls', label: 'Calls', mobileLabel: 'Calls' },
    { key: 'music', label: 'Music', mobileLabel: 'Music' },
    { key: 'image-music', label: 'Img+Music', mobileLabel: 'Img+Music' },
    { key: 'tts', label: 'TTS', mobileLabel: 'TTS' },
    { key: 'sfx', label: 'SFX', mobileLabel: 'SFX' },
    { key: 'convert', label: 'Convert', mobileLabel: 'Convert' },
    { key: 'isolate', label: 'Isolate', mobileLabel: 'Isolate' },
    { key: 'occasion', label: 'Occasions', mobileLabel: 'Occasions' },
  ];

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-4 md:py-8 px-3 md:px-4 max-w-6xl mobile-safe-bottom pb-20 md:pb-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
            <Calendar className="w-6 h-6 md:w-10 md:h-10" />
            My Bookings
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">View all your orders and generations</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          {/* Mobile: horizontally scrollable pill tabs */}
          <div className="md:hidden -mx-3 px-3">
            <TabsList className="inline-flex w-max h-auto gap-2 p-1.5 bg-transparent overflow-x-auto no-scrollbar">
              {tabConfig.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border border-border/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary bg-muted/30">
                  {t.mobileLabel} ({getCount(t.key)})
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Desktop: standard wrapped tabs */}
          <TabsList className="hidden md:flex flex-wrap w-full h-auto gap-1 justify-start">
            {tabConfig.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="text-sm py-2.5">
                {t.label} ({getCount(t.key)})
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Celebrity Bookings Tab */}
          <TabsContent value="celebrity" className="space-y-3 md:space-y-4">
            {isTabLoading('celebrity') ? <TabSpinner /> : getData('celebrity').length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 md:py-12">
                  <Star className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                  <p className="text-sm md:text-base text-muted-foreground">No celebrity bookings yet</p>
                  <Link to="/celebrities"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Browse Celebrities</Badge></Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('celebrity').map((booking: any) => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                        <img src={booking.celebrities?.image_url || '/placeholder.svg'} alt={booking.celebrities?.name} className="w-full sm:w-16 md:w-20 h-32 sm:h-16 md:h-20 rounded-lg object-cover" />
                        <div className="flex-1 w-full">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base md:text-lg truncate">{booking.celebrities?.name}</h3>
                              <p className="text-xs md:text-sm text-muted-foreground">{booking.celebrities?.category}</p>
                            </div>
                            {getCompositeStatusBadge(booking)}
                          </div>

                          {booking.status !== 'pending' && (
                            <div className="flex items-center gap-0.5 mt-2 mb-1 overflow-x-auto">
                              {getTimelineStage(booking).map((stage, idx) => (
                                <div key={idx} className="flex items-center">
                                  <div className="flex flex-col items-center min-w-[60px]">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${stage.failed ? 'bg-destructive text-destructive-foreground' : stage.completed ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                      {stage.failed ? '✕' : stage.completed ? '✓' : idx + 1}
                                    </div>
                                    <span className={`text-[9px] md:text-[10px] mt-0.5 text-center leading-tight ${stage.failed ? 'text-destructive' : stage.completed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{stage.label}</span>
                                  </div>
                                  {idx < 5 && <div className={`w-4 h-0.5 mt-[-12px] ${stage.completed ? 'bg-green-500' : 'bg-muted'}`} />}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                            <div className="flex items-center gap-2">
                              <Video className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{getServiceTypeLabel(booking.service_type)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs md:text-sm">{format(new Date(booking.created_at), 'PP')}</span>
                            </div>
                            {booking.message && (
                              <div className="text-muted-foreground mt-2 p-2 md:p-3 bg-muted rounded-lg">
                                <p className="font-medium mb-1 text-xs md:text-sm">Message:</p>
                                {(() => {
                                  const parsed = parseBookingMessage(booking.message);
                                  if (parsed.recipientName) {
                                    return (
                                      <div className="space-y-1 text-xs md:text-sm">
                                        {parsed.recipientName && <p><span className="font-medium">For:</span> {parsed.recipientName}</p>}
                                        {parsed.occasion && <p><span className="font-medium">Occasion:</span> {parsed.occasion}</p>}
                                        {parsed.message && <p className="line-clamp-2"><span className="font-medium">Message:</span> {parsed.message}</p>}
                                      </div>
                                    );
                                  }
                                  return <p className="text-xs md:text-sm line-clamp-2">{parsed.message}</p>;
                                })()}
                              </div>
                            )}
                          </div>

                          {(booking.status === 'video_sent' || booking.status === 'sent' || booking.status === 'completed') && booking.video_file_key && (
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                                  <CheckCircle className="w-4 h-4" /><span>Your Video is Ready!</span>
                                </div>
                                <B2VideoPlayer fileKey={booking.video_file_key} fallbackUrl={booking.video_url} className="w-full rounded-lg" />
                              </div>
                            </div>
                          )}
                          {booking.status === 'confirmed' && booking.video_file_key && booking.video_status === 'ready' && (
                            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                              <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                <div>
                                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Video Created — Under Review</p>
                                  <p className="text-xs text-muted-foreground">Our team is reviewing your video. You'll be notified once it's delivered.</p>
                                </div>
                              </div>
                            </div>
                          )}
                          {booking.status === 'confirmed' && (!booking.video_file_key || booking.video_status !== 'ready') && (
                            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                <div>
                                  <p className="text-sm font-medium">Video is being created...</p>
                                  <p className="text-xs text-muted-foreground">This may take a few minutes</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3 md:mt-4 pt-3 md:pt-4 border-t gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] md:text-xs text-muted-foreground">Order ID</p>
                              <p className="text-xs md:text-sm font-mono truncate">{booking.id.slice(0, 8)}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[10px] md:text-xs text-muted-foreground">Amount</p>
                              <p className="text-base md:text-lg font-bold">₹{booking.final_price.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Wishes Tab */}
          <TabsContent value="wishes" className="space-y-3 md:space-y-4">
            {isTabLoading('wishes') ? <TabSpinner /> : getData('wishes').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <Heart className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No celebrity wishes yet</p>
                <Link to="/wish-celebrity"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Send a Wish</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('wishes').map((wish: any) => (
                  <Card key={wish.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                        <img src={wish.celebrities?.image_url || '/placeholder.svg'} alt={wish.celebrities?.name} className="w-full sm:w-16 md:w-20 h-32 sm:h-16 md:h-20 rounded-lg object-cover" />
                        <div className="flex-1 w-full">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base md:text-lg truncate">{wish.celebrities?.name}</h3>
                              <p className="text-xs md:text-sm text-muted-foreground">{wish.occasion_type}</p>
                            </div>
                            {getStatusBadge(wish.status)}
                          </div>
                          <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                            <div className="flex items-center gap-2"><Gift className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" /><span className="truncate">To: {wish.recipient_name}</span></div>
                            <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" /><span className="text-xs md:text-sm">{format(new Date(wish.created_at), 'PP')}</span></div>
                            {wish.message && (<div className="text-muted-foreground mt-2 p-2 md:p-3 bg-muted rounded-lg"><p className="font-medium mb-1 text-xs md:text-sm">Message:</p><p className="text-xs md:text-sm line-clamp-2">{wish.message}</p></div>)}
                            {(wish.generated_card_image_url || wish.card_url) && (
                              <div className="mt-2">
                                <img src={wish.generated_card_image_url || wish.card_url} alt="Wish card" className="w-full max-h-[400px] object-contain rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity hover:scale-[1.02] bg-muted/30"
                                  onClick={() => setPreviewImage({ url: wish.generated_card_image_url || wish.card_url, alt: `${wish.occasion_type} card for ${wish.recipient_name}` })} />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-3 md:mt-4 pt-3 md:pt-4 border-t gap-3">
                            <div className="flex-1 min-w-0"><p className="text-[10px] md:text-xs text-muted-foreground">Order ID</p><p className="text-xs md:text-sm font-mono truncate">{wish.id.slice(0, 8)}</p></div>
                            <div className="text-right flex-shrink-0"><p className="text-[10px] md:text-xs text-muted-foreground">Amount</p><p className="text-base md:text-lg font-bold">₹{wish.amount_paid?.toLocaleString()}</p></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Greeting Cards Tab */}
          <TabsContent value="greeting" className="space-y-3 md:space-y-4">
            {isTabLoading('greeting') ? <TabSpinner /> : getData('greeting').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <Gift className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No greeting cards generated yet</p>
                <Link to="/greeting-cards"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Create Greeting Card</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('greeting').map((card: any) => (
                  <Card key={card.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 md:mb-4 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          {getStatusIcon(card.status)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm md:text-base truncate">{card.occasion_name} - {card.original_prompt}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">For: {card.recipient_name}</p>
                          </div>
                        </div>
                        {getStatusBadge(card.status)}
                      </div>
                      {card.generated_image_url && (
                        <img src={card.generated_image_url} alt={`${card.occasion_name} card`} className="w-full h-48 md:h-64 object-contain rounded-lg mb-3 md:mb-4 bg-muted/30 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewImage({ url: card.generated_image_url, alt: `${card.occasion_name} card for ${card.recipient_name}` })} />
                      )}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs md:text-sm gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" /><span className="text-muted-foreground truncate text-xs md:text-sm">{format(new Date(card.created_at), 'PP')}</span></div>
                        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                          {card.generated_image_url && <a href={card.generated_image_url} download className="flex items-center gap-1 text-primary hover:underline text-xs md:text-sm"><Download className="w-3.5 h-3.5" />Download</a>}
                          <span className="font-medium text-xs md:text-sm">₹{card.amount_charged || 100}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Photo Wishes Tab */}
          <TabsContent value="photo" className="space-y-3 md:space-y-4">
            {isTabLoading('photo') ? <TabSpinner /> : getData('photo').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <ImageIcon className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No photo wishes yet</p>
                <Link to="/photo-wish"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Create Photo Wish</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('photo').map((photo: any) => (
                  <Card key={photo.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 md:mb-4 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          {getStatusIcon(photo.status)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm md:text-base truncate">{photo.occasion_type} Photo Wish</h3>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">For: {photo.recipient_name}</p>
                          </div>
                        </div>
                        {getStatusBadge(photo.status)}
                      </div>
                      {photo.output_url && (
                        <img src={photo.output_url} alt="Photo wish" className="w-full h-48 md:h-64 object-contain rounded-lg mb-3 md:mb-4 bg-muted/30 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewImage({ url: photo.output_url, alt: `Photo wish for ${photo.recipient_name}` })} />
                      )}
                      <div className="flex items-center justify-between text-xs md:text-sm gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" /><span className="text-muted-foreground">{format(new Date(photo.created_at), 'PP')}</span></div>
                        <span className="font-medium">₹{photo.credits_used || 150}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Music Tab */}
          <TabsContent value="music" className="space-y-3 md:space-y-4">
            {isTabLoading('music') ? <TabSpinner /> : getData('music').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <Music className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No music generated yet</p>
                <Link to="/ai-music"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Create Music</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('music').map((music: any) => (
                  <Card key={music.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 md:mb-4 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          {getStatusIcon(music.status)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm md:text-base truncate">{music.song_title || `${music.genre} - ${music.mood}`}</h3>
                            {music.has_vocals && <p className="text-xs md:text-sm text-primary">🎤 With Vocals</p>}
                          </div>
                        </div>
                        {getStatusBadge(music.status)}
                      </div>
                      {music.lyrics && (<div className="bg-muted p-2 md:p-3 rounded-lg mb-3 md:mb-4"><p className="text-xs md:text-sm line-clamp-3">{music.lyrics}</p></div>)}
                      {music.status === 'completed' && music.audio_url && (
                        <div className="space-y-2 mb-3 md:mb-4">
                          <audio controls className="w-full h-10 md:h-12"><source src={music.audio_url} type="audio/mpeg" /></audio>
                          <a href={music.audio_url} download={`music-${music.id.slice(0,8)}.mp3`} className="flex items-center justify-center gap-2 text-xs md:text-sm text-primary hover:underline"><Download className="w-3.5 h-3.5" />Download</a>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs md:text-sm gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" /><span className="text-muted-foreground">{format(new Date(music.created_at), 'PP')}</span></div>
                        <span className="font-medium">₹{music.credits_used || 200}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Image + Music Tab */}
          <TabsContent value="image-music" className="space-y-3 md:space-y-4">
            {isTabLoading('image-music') ? <TabSpinner /> : getData('image-music').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <ImageIcon className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No image + music creations yet</p>
                <Link to="/music-studio"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Create Image + Music</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('image-music').map((order: any) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 md:mb-4 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          {getStatusIcon(order.status)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm md:text-base truncate">{order.genre} - {order.mood}</h3>
                            {order.has_vocals && <p className="text-xs md:text-sm text-primary">🎤 With Vocals</p>}
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      {order.image_url && (
                        <img src={order.image_url} alt="Image + Music creation" className="w-full h-40 md:h-48 object-cover rounded-lg mb-3 md:mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewImage({ url: order.image_url, alt: 'Image + Music creation' })} />
                      )}
                      {order.description && (<div className="bg-muted p-2 md:p-3 rounded-lg mb-3 md:mb-4"><p className="text-xs md:text-sm line-clamp-2">{order.description}</p></div>)}
                      {order.status === 'completed' && order.audio_url && (
                        <div className="space-y-2 mb-3 md:mb-4">
                          <audio controls className="w-full h-10 md:h-12"><source src={order.audio_url} type="audio/mpeg" /></audio>
                          <a href={order.audio_url} download={`image-music-${order.id.slice(0,8)}.mp3`} className="flex items-center justify-center gap-2 text-xs md:text-sm text-primary hover:underline"><Download className="w-3.5 h-3.5" />Download Audio</a>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs md:text-sm gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" /><span className="text-muted-foreground truncate text-xs md:text-sm">{format(new Date(order.created_at), 'PP')}</span></div>
                        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0"><span className="font-medium text-xs md:text-sm">₹{order.amount_charged}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Celebrity Calls Tab */}
          <TabsContent value="calls" className="space-y-3 md:space-y-4">
            {isTabLoading('calls') ? <TabSpinner /> : getData('calls').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <Phone className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No celebrity calls yet</p>
                <Link to="/celebrity-voice-call"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Make a Celebrity Call</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('calls').map((call: any) => (
                  <Card key={call.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                        <img src={call.celebrities?.image_url || '/placeholder.svg'} alt={call.celebrities?.name || call.vapi_voice_name} className="w-full sm:w-16 md:w-20 h-32 sm:h-16 md:h-20 rounded-lg object-cover" />
                        <div className="flex-1 w-full">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base md:text-lg truncate">{call.celebrities?.name || call.vapi_voice_name}</h3>
                              <p className="text-xs md:text-sm text-muted-foreground truncate">Call to: {call.recipient_name}</p>
                            </div>
                            {call.call_status === 'scheduled' ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"><CalendarClock className="w-3 h-3 mr-1" />Scheduled</Badge>
                            ) : getStatusBadge(call.call_status)}
                          </div>
                          <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                            <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" /><span className="truncate">{call.recipient_phone}</span></div>
                            <div className="flex items-center gap-2"><Gift className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" /><span>{call.occasion}</span></div>
                            {call.sender_name && <div className="flex items-center gap-2"><Heart className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" /><span>From: {call.sender_name}</span></div>}
                          </div>
                          {call.scheduled_at && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                <CalendarClock className="w-4 h-4" />
                                <div>
                                  <p className="text-sm font-medium">Scheduled for: {format(new Date(call.scheduled_at), "EEEE, MMMM do, yyyy")}</p>
                                  <p className="text-xs">at {format(new Date(call.scheduled_at), "h:mm a")}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          {call.call_duration_seconds && call.call_status === 'completed' && (
                            <div className="mt-2 text-xs text-muted-foreground">Duration: {Math.floor(call.call_duration_seconds / 60)}m {call.call_duration_seconds % 60}s</div>
                          )}
                          <div className="flex items-center justify-between mt-3 md:mt-4 pt-3 md:pt-4 border-t gap-3">
                            <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" /><span className="text-xs md:text-sm truncate">{format(new Date(call.created_at), 'PP')}</span></div>
                            <div className="text-right flex-shrink-0"><p className="text-base md:text-lg font-bold">₹{call.price_paid?.toLocaleString()}</p></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TTS Tab */}
          <TabsContent value="tts" className="space-y-3 md:space-y-4">
            {isTabLoading('tts') ? <TabSpinner /> : getData('tts').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <Volume2 className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No text-to-speech generations yet</p>
                <Link to="/music-studio"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Generate Speech</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('tts').map((tts: any) => (
                  <Card key={tts.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 md:mb-4 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          <Volume2 className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0"><h3 className="font-semibold text-sm md:text-base truncate">Text to Speech</h3><p className="text-xs md:text-sm text-muted-foreground">Voice: {tts.voice_name || 'Unknown'}</p></div>
                        </div>
                        {getStatusBadge(tts.status)}
                      </div>
                      <div className="bg-muted p-2 md:p-3 rounded-lg mb-3 md:mb-4"><p className="text-xs md:text-sm line-clamp-3">{tts.text}</p></div>
                      {tts.audio_url && <audio controls className="w-full h-10 md:h-12 mb-3"><source src={tts.audio_url} type="audio/mpeg" /></audio>}
                      <div className="flex items-center justify-between text-xs md:text-sm gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" /><span className="text-muted-foreground">{format(new Date(tts.created_at), 'PP')}</span></div>
                        <span className="font-medium">₹{tts.credits_used || 50}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SFX Tab */}
          <TabsContent value="sfx" className="space-y-3 md:space-y-4">
            {isTabLoading('sfx') ? <TabSpinner /> : getData('sfx').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <Wand2 className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No sound effects generated yet</p>
                <Link to="/music-studio"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Generate SFX</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('sfx').map((sfx: any) => (
                  <Card key={sfx.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 md:mb-4 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          <Wand2 className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0"><h3 className="font-semibold text-sm md:text-base truncate">Sound Effect</h3><p className="text-xs md:text-sm text-muted-foreground">{sfx.duration_seconds}s duration</p></div>
                        </div>
                        {getStatusBadge(sfx.status)}
                      </div>
                      <div className="bg-muted p-2 md:p-3 rounded-lg mb-3 md:mb-4"><p className="text-xs md:text-sm line-clamp-3">{sfx.description}</p></div>
                      {sfx.audio_url && <audio controls className="w-full h-10 md:h-12 mb-3"><source src={sfx.audio_url} type="audio/mpeg" /></audio>}
                      <div className="flex items-center justify-between text-xs md:text-sm gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" /><span className="text-muted-foreground">{format(new Date(sfx.created_at), 'PP')}</span></div>
                        <span className="font-medium">₹{sfx.credits_used || 60}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Voice Conversion Tab */}
          <TabsContent value="convert" className="space-y-3 md:space-y-4">
            {isTabLoading('convert') ? <TabSpinner /> : getData('convert').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <Mic className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No voice conversions yet</p>
                <Link to="/music-studio"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Convert Voice</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('convert').map((vc: any) => (
                  <Card key={vc.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 md:mb-4 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          <Mic className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0"><h3 className="font-semibold text-sm md:text-base truncate">Voice Conversion</h3><p className="text-xs md:text-sm text-muted-foreground">To: {vc.target_voice_name || 'Unknown'}</p></div>
                        </div>
                        {getStatusBadge(vc.status)}
                      </div>
                      {vc.original_file_name && (<div className="bg-muted p-2 md:p-3 rounded-lg mb-3 md:mb-4"><p className="text-xs md:text-sm">Original: {vc.original_file_name}</p></div>)}
                      {vc.audio_url && <audio controls className="w-full h-10 md:h-12 mb-3"><source src={vc.audio_url} type="audio/mpeg" /></audio>}
                      <div className="flex items-center justify-between text-xs md:text-sm gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" /><span className="text-muted-foreground">{format(new Date(vc.created_at), 'PP')}</span></div>
                        <span className="font-medium">₹{vc.credits_used || 75}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audio Isolation Tab */}
          <TabsContent value="isolate" className="space-y-3 md:space-y-4">
            {isTabLoading('isolate') ? <TabSpinner /> : getData('isolate').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <FileAudio className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No audio isolations yet</p>
                <Link to="/music-studio"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Isolate Audio</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('isolate').map((ai: any) => (
                  <Card key={ai.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 md:mb-4 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          <FileAudio className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0"><h3 className="font-semibold text-sm md:text-base truncate">Audio Isolation</h3><p className="text-xs md:text-sm text-muted-foreground">Noise removed</p></div>
                        </div>
                        {getStatusBadge(ai.status)}
                      </div>
                      {ai.original_file_name && (<div className="bg-muted p-2 md:p-3 rounded-lg mb-3 md:mb-4"><p className="text-xs md:text-sm">Original: {ai.original_file_name}</p></div>)}
                      {ai.audio_url && <audio controls className="w-full h-10 md:h-12 mb-3"><source src={ai.audio_url} type="audio/mpeg" /></audio>}
                      <div className="flex items-center justify-between text-xs md:text-sm gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" /><span className="text-muted-foreground">{format(new Date(ai.created_at), 'PP')}</span></div>
                        <span className="font-medium">₹{ai.credits_used || 40}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Occasion Bookings Tab */}
          <TabsContent value="occasion" className="space-y-3 md:space-y-4">
            {isTabLoading('occasion') ? <TabSpinner /> : getData('occasion').length === 0 ? (
              <Card><CardContent className="text-center py-8 md:py-12">
                <Gift className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">No occasion bookings yet</p>
                <Link to="/occasions"><Badge className="mt-3 md:mt-4 cursor-pointer text-xs md:text-sm">Browse Occasions</Badge></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {getData('occasion').map((occasion: any) => (
                  <Card key={occasion.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                        <img src={occasion.celebrities?.image_url || '/placeholder.svg'} alt={occasion.celebrities?.name} className="w-full sm:w-16 md:w-20 h-32 sm:h-16 md:h-20 rounded-lg object-cover" />
                        <div className="flex-1 w-full">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base md:text-lg truncate">{occasion.occasions?.name}</h3>
                              <p className="text-xs md:text-sm text-muted-foreground truncate">Celebrity: {occasion.celebrities?.name}</p>
                            </div>
                            {getStatusBadge(occasion.status)}
                          </div>
                          <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                            <div><span className="text-muted-foreground">Recipient:</span> {occasion.recipient_name}</div>
                            {occasion.message && (<div className="text-muted-foreground mt-2 p-2 md:p-3 bg-muted rounded-lg"><p className="font-medium mb-1 text-xs md:text-sm">Message:</p><p className="text-xs md:text-sm line-clamp-2">{occasion.message}</p></div>)}
                          </div>
                          <div className="flex items-center justify-between mt-3 md:mt-4 pt-3 md:pt-4 border-t gap-3">
                            <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" /><span className="text-xs md:text-sm truncate">{format(new Date(occasion.created_at), 'PP')}</span></div>
                            <div className="text-right flex-shrink-0"><p className="text-base md:text-lg font-bold">₹{occasion.price.toLocaleString()}</p></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {previewImage && (
        <ImagePreviewModal imageUrl={previewImage.url} alt={previewImage.alt} open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)} />
      )}
    </AuthenticatedLayout>
  );
}
