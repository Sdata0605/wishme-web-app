import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, Loader2, User, Calendar, Star, Search, MessageSquare, Heart, Languages, Ban, Clock, CalendarIcon, BadgePercent, Zap, FileText, Camera, ShieldCheck, PhoneCall, ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { usePlanDiscount } from '@/hooks/usePlanDiscount';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { CelebrityCallModal } from '@/components/celebrity/CelebrityCallModal';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Celebrity {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  vapi_voice_id: string;
  voice_call_price: number;
  rating: number;
  is_verified: boolean;
  vapi_phone_id?: string;
}

const OCCASIONS = [
  'Birthday', 'Anniversary', 'Graduation', 'New Year', 'Diwali', 'Christmas',
  'Eid', 'Holi', 'Promotion', 'Wedding', 'Engagement', 'Baby Shower',
  'Retirement', 'Get Well Soon', 'Thank You', 'Congratulations', 'Good Luck', 'Other'
];

const TONES = [
  { value: 'warm_loving', label: 'Warm & Loving' },
  { value: 'funny_playful', label: 'Funny & Playful' },
  { value: 'inspirational', label: 'Inspirational & Motivational' },
  { value: 'formal', label: 'Formal & Professional' },
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'emotional', label: 'Emotional & Heartfelt' },
  { value: 'enthusiastic', label: 'Enthusiastic & High Energy' }
];

const RELATIONSHIPS = [
  { value: 'friend', label: 'Friend / Bestie' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'spouse', label: 'Spouse / Partner' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'boss', label: 'Boss / Manager' },
  { value: 'relative', label: 'Relative' },
  { value: 'other', label: 'Other' }
];

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi (Hinglish)' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'kannada', label: 'Kannada' },
  { value: 'malayalam', label: 'Malayalam' },
  { value: 'marathi', label: 'Marathi' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'punjabi', label: 'Punjabi' }
];

const JOURNEY_STEPS = [
  { icon: Search, label: 'Select Celebrity', desc: 'Choose from our curated roster of icons.' },
  { icon: Sparkles, label: 'Choose Occasion', desc: 'Birthday, anniversary, or just because.' },
  { icon: FileText, label: 'Enter Details', desc: 'Tell us who and what to say.' },
  { icon: Camera, label: 'Secure Pay', desc: 'Fast, encrypted, and exclusive.' },
  { icon: PhoneCall, label: 'Call Delivered', desc: 'The magic happens on your phone.' },
];

export default function CelebrityVoiceCall() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const { balance: walletBalance } = useWalletBalance();
  const { discountPercentage, planName, getDiscountedPrice } = usePlanDiscount();

  const [isLoading, setIsLoading] = useState(false);
  const [showCelebrityModal, setShowCelebrityModal] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [occasion, setOccasion] = useState('');
  const [senderName, setSenderName] = useState('');
  const [selectedCelebrity, setSelectedCelebrity] = useState<Celebrity | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [tone, setTone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [language, setLanguage] = useState('english');
  const [thingsToAvoid, setThingsToAvoid] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [callTiming, setCallTiming] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('10:00');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (profile?.first_name) {
      setSenderName(`${profile.first_name} ${profile.last_name || ''}`.trim());
    }
    const celebrityId = searchParams.get('celebrityId');
    if (celebrityId && profile?.id) {
      fetchCelebrityById(celebrityId);
    } else {
      setShowCelebrityModal(true);
    }
  }, [user, profile, navigate, searchParams, authLoading]);

  const fetchCelebrityById = async (celebrityId: string) => {
    try {
      const [celebResult, subResult] = await Promise.all([
        supabase.from('celebrities')
          .select('id, name, category, image_url, vapi_voice_id, voice_call_price, rating, is_verified, vapi_phone_id')
          .eq('id', celebrityId).not('vapi_voice_id', 'is', null).single(),
        supabase.from('celebrity_favorites')
          .select('id').eq('user_id', profile!.id).eq('celebrity_id', celebrityId).eq('status', 'active').maybeSingle()
      ]);
      if (celebResult.error) throw celebResult.error;
      if (celebResult.data && subResult.data) {
        setSelectedCelebrity(celebResult.data);
      } else if (celebResult.data && !subResult.data) {
        toast({ title: 'Subscription required', description: `You need to subscribe to ${celebResult.data.name} before placing a call.`, variant: 'destructive' });
        navigate(`/celebrity/${celebrityId}`);
      } else {
        setShowCelebrityModal(true);
      }
    } catch (error) {
      console.error('Error fetching celebrity:', error);
      setShowCelebrityModal(true);
    }
  };

  const handleMakeCall = async () => {
    if (!recipientName.trim() || !recipientPhone.trim() || !occasion || !selectedCelebrity || !senderName.trim()) {
      toast({ title: 'Missing information', description: 'Please fill in all required fields (marked with *)', variant: 'destructive' });
      return;
    }

    // Client-side phone validation
    const cleanedPhone = recipientPhone.replace(/[\s\-()\.]/g, '');
    const phoneDigits = cleanedPhone.replace(/^\+?(91)?/, '');
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      toast({ title: 'Invalid phone number', description: 'Please enter a valid 10-digit Indian mobile number starting with 6-9', variant: 'destructive' });
      return;
    }
    const formattedPhone = '+91' + phoneDigits;

    if (callTiming === 'scheduled' && !scheduledDate) {
      toast({ title: 'Missing schedule', description: 'Please select a date for the scheduled call', variant: 'destructive' });
      return;
    }
    const baseCallPrice = selectedCelebrity.voice_call_price || 500;
    const callPrice = getDiscountedPrice(baseCallPrice);
    if (walletBalance < callPrice) {
      toast({ title: 'Insufficient balance', description: `You need ₹${callPrice} in your wallet. Current balance: ₹${walletBalance}`, variant: 'destructive' });
      navigate('/wallet');
      return;
    }
    let scheduledAt: string | null = null;
    if (callTiming === 'scheduled' && scheduledDate) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);
      scheduledAt = scheduledDateTime.toISOString();
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vapi-celebrity-call', {
        body: {
          recipientName, recipientPhone: formattedPhone, occasion, senderName,
          celebrityId: selectedCelebrity.id, celebrityName: selectedCelebrity.name,
          voiceId: selectedCelebrity.vapi_voice_id, price: callPrice,
          celebrityPhoneId: selectedCelebrity.vapi_phone_id,
          customMessage: customMessage.trim(), tone, relationship, language,
          thingsToAvoid: thingsToAvoid.trim(), additionalContext: additionalContext.trim(),
          scheduledAt
        }
      });
      // Check for error in response data (non-2xx returns data with error field)
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const successMessage = scheduledAt
        ? `Your call has been scheduled for ${format(new Date(scheduledAt), "PPP 'at' h:mm a")}`
        : `${selectedCelebrity.name} is now calling ${recipientName} to wish them!`;
      toast({ title: scheduledAt ? 'Call scheduled!' : 'Call initiated!', description: successMessage });
      setRecipientName(''); setRecipientPhone(''); setOccasion('');
      setCustomMessage(''); setTone(''); setRelationship('');
      setThingsToAvoid(''); setAdditionalContext('');
      setSelectedCelebrity(null); setCallTiming('now');
      setScheduledDate(undefined); setScheduledTime('10:00');
    } catch (error) {
      console.error('Error making call:', error);
      toast({ title: 'Call failed', description: error instanceof Error ? error.message : 'Failed to initiate call. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const callPrice = selectedCelebrity ? getDiscountedPrice(selectedCelebrity.voice_call_price || 500) : 0;
  const basePrice = selectedCelebrity ? (selectedCelebrity.voice_call_price || 500) : 0;

  return (
    <AuthenticatedLayout showSidebar>
      <div className="min-h-screen bg-[#0A0A14] text-white">
        {/* Hero */}
        <section className="relative pt-20 pb-14 sm:pt-28 sm:pb-20 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-purple-600/15 rounded-full blur-[140px]" />
            <div className="absolute top-10 left-1/4 w-[200px] h-[300px] bg-pink-600/10 rounded-full blur-[80px]" />
            <div className="absolute top-10 right-1/4 w-[200px] h-[300px] bg-orange-600/8 rounded-full blur-[80px]" />
            {/* Stage light beams */}
            <div className="absolute top-0 left-[20%] w-[2px] h-40 bg-gradient-to-b from-white/10 to-transparent rotate-[15deg]" />
            <div className="absolute top-0 left-[40%] w-[2px] h-52 bg-gradient-to-b from-white/8 to-transparent rotate-[5deg]" />
            <div className="absolute top-0 right-[35%] w-[2px] h-48 bg-gradient-to-b from-white/8 to-transparent rotate-[-8deg]" />
            <div className="absolute top-0 right-[20%] w-[2px] h-40 bg-gradient-to-b from-white/10 to-transparent rotate-[-15deg]" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="italic text-white">Experience Stardom:</span>
              <br />
              <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                Celebrity Voice Calls
              </span>
            </h1>
            <p className="text-sm sm:text-base text-white/40 max-w-xl mx-auto leading-relaxed">
              Transform any occasion into a legendary memory with a personalized voice call from your favorite icon. Exclusive, emotional, and unforgettable.
            </p>
          </div>
        </section>

        {/* Journey Steps */}
        <section className="py-10 sm:py-16">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-center text-xl sm:text-2xl font-semibold mb-10">
              The Journey to a{' '}
              <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">Moment</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-3">
              {JOURNEY_STEPS.map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 relative">
                    <step.icon className="w-6 h-6 text-pink-400" />
                    {i === JOURNEY_STEPS.length - 1 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-white mb-1">{step.label}</span>
                  <span className="text-[10px] sm:text-xs text-white/35 leading-snug max-w-[120px]">{step.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content: Sidebar + Form */}
        <section className="py-8 sm:py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-[260px_1fr] gap-6">

              {/* Left Sidebar */}
              <div className="space-y-4">
                {/* Celebrity Selection */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-4 h-4 text-pink-400" />
                    <span className="text-sm font-semibold text-white">Select a Celebrity</span>
                  </div>

                  {selectedCelebrity ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-pink-500/20">
                        <Avatar className="h-10 w-10 border border-pink-500/30">
                          <AvatarImage src={selectedCelebrity.image_url || undefined} alt={selectedCelebrity.name} />
                          <AvatarFallback className="bg-pink-500/20 text-pink-400 text-sm font-bold">
                            {selectedCelebrity.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white truncate">{selectedCelebrity.name}</span>
                            {selectedCelebrity.is_verified && (
                              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                <span className="text-[8px] text-white">✓</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-white/40">₹{selectedCelebrity.voice_call_price || 500} per call</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCelebrityModal(true)}
                        className="w-full text-xs text-white/40 hover:text-pink-400 transition-colors flex items-center justify-center gap-1 py-1"
                      >
                        View All Artists <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCelebrityModal(true)}
                      className="w-full py-6 rounded-xl border border-dashed border-white/10 hover:border-pink-500/30 hover:bg-white/[0.02] transition-all flex flex-col items-center gap-2"
                    >
                      <Phone className="w-6 h-6 text-white/30" />
                      <span className="text-xs text-white/40">Tap to select a celebrity</span>
                    </button>
                  )}
                </div>

                {/* Premium Quality Card */}
                <div className="rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent border border-pink-500/10 p-4">
                  <h4 className="text-base font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-400 bg-clip-text text-transparent mb-2">
                    Premium Quality
                  </h4>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    Every call is recorded in high-fidelity studio quality and verified by the celebrity's official agency.
                  </p>
                </div>

                {/* Wallet Balance (mobile: hidden, shown in footer) */}
                <div className="hidden lg:block rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
                  <span className="text-[11px] uppercase tracking-wider text-white/30 font-medium">Wallet Balance</span>
                  <div className="text-2xl font-bold text-white mt-1">₹{walletBalance}</div>
                  {discountPercentage > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <BadgePercent className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] text-emerald-400 font-medium">{discountPercentage}% {planName} discount active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Form */}
              <div className="space-y-6">

                {/* Section 1: Call Details */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">1</div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">Call Details</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Your Name</Label>
                      <Input
                        placeholder="e.g. Rahul Sharma"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 h-10 text-sm focus:border-pink-500/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Recipient's Name</Label>
                      <Input
                        placeholder="Who are they calling?"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 h-10 text-sm focus:border-pink-500/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Phone Number</Label>
                      <Input
                        placeholder="+91 00000 00000"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 h-10 text-sm focus:border-pink-500/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Occasion</Label>
                      <Select value={occasion} onValueChange={setOccasion}>
                        <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white h-10 text-sm focus:border-pink-500/40 [&>span]:text-white/50">
                          <SelectValue placeholder="Birthday Surprise" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A2E] border-white/10">
                          {OCCASIONS.map((occ) => (
                            <SelectItem key={occ} value={occ} className="text-white/80 focus:bg-white/10 focus:text-white">{occ}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Scheduling */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">2</div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">Scheduling</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => setCallTiming('now')}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                        callTiming === 'now'
                          ? "bg-gradient-to-r from-orange-500/10 to-pink-500/10 border-pink-500/30"
                          : "bg-white/[0.02] border-white/[0.06] hover:border-white/10"
                      )}
                    >
                      <Zap className={cn("w-5 h-5 shrink-0", callTiming === 'now' ? "text-orange-400" : "text-white/30")} />
                      <div>
                        <div className="text-sm font-semibold text-white">Call Now</div>
                        <div className="text-[11px] text-white/35">Estimated wait: 4-5 mins</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setCallTiming('scheduled')}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                        callTiming === 'scheduled'
                          ? "bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-purple-500/30"
                          : "bg-white/[0.02] border-white/[0.06] hover:border-white/10"
                      )}
                    >
                      <Calendar className={cn("w-5 h-5 shrink-0", callTiming === 'scheduled' ? "text-purple-400" : "text-white/30")} />
                      <div>
                        <div className="text-sm font-semibold text-white">Schedule Later</div>
                        <div className="text-[11px] text-white/35">Pick a future date & time</div>
                      </div>
                    </button>
                  </div>

                  {callTiming === 'scheduled' && (
                    <div className="grid sm:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Select Date</Label>
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-white/[0.04] border-white/[0.08] text-white h-10 text-sm hover:bg-white/[0.06]",
                                !scheduledDate && "text-white/30"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-white/30" />
                              {scheduledDate ? format(scheduledDate, "PPP") : "mm/dd/yyyy"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-[#1A1A2E] border-white/10" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={scheduledDate}
                              onSelect={(date) => { setScheduledDate(date); setDatePickerOpen(false); }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Preferred Time Window</Label>
                        <Select value={scheduledTime} onValueChange={setScheduledTime}>
                          <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white h-10 text-sm">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A2E] border-white/10 max-h-60">
                            {Array.from({ length: 24 }, (_, hour) => {
                              const h = hour.toString().padStart(2, '0');
                              return ['00', '30'].map(min => (
                                <SelectItem key={`${h}:${min}`} value={`${h}:${min}`} className="text-white/80 focus:bg-white/10 focus:text-white">
                                  {format(new Date(2000, 0, 1, hour, parseInt(min)), 'h:mm a')}
                                </SelectItem>
                              ));
                            }).flat()}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Personalization */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">3</div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">Personalization</h3>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Tone & Style</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white h-10 text-sm focus:border-pink-500/40 [&>span]:text-white/50">
                          <SelectValue placeholder="Enthusiastic & High Energy" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A2E] border-white/10">
                          {TONES.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-white/80 focus:bg-white/10 focus:text-white">{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Relationship</Label>
                      <Select value={relationship} onValueChange={setRelationship}>
                        <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white h-10 text-sm focus:border-pink-500/40 [&>span]:text-white/50">
                          <SelectValue placeholder="Friend / Bestie" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A2E] border-white/10">
                          {RELATIONSHIPS.map((r) => (
                            <SelectItem key={r.value} value={r.value} className="text-white/80 focus:bg-white/10 focus:text-white">{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white h-10 text-sm focus:border-pink-500/40 [&>span]:text-white/50">
                          <SelectValue placeholder="Hindi (Hinglish)" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A2E] border-white/10">
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l.value} value={l.value} className="text-white/80 focus:bg-white/10 focus:text-white">{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Custom Message / Things to Say</Label>
                    <Textarea
                      placeholder={selectedCelebrity ? `Mention special memories, nicknames, or specific accomplishments you want ${selectedCelebrity.name} to talk about...` : 'Mention special memories, nicknames, or things you want the celebrity to say...'}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      maxLength={500}
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 text-sm min-h-[90px] focus:border-pink-500/40 resize-none"
                    />
                    <div className="text-right text-[10px] text-white/25">{customMessage.length} / 500 characters</div>
                  </div>
                </div>

                {/* Footer: Price + CTA */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-white/30 font-medium block mb-1">Estimated Total</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-bold text-white">
                          ₹{selectedCelebrity ? callPrice.toLocaleString() : '—'}
                        </span>
                        {selectedCelebrity && discountPercentage > 0 && (
                          <span className="text-sm text-white/30 line-through">₹{basePrice.toLocaleString()}</span>
                        )}
                        <span className="text-xs text-white/30">incl. taxes</span>
                      </div>
                      {selectedCelebrity && discountPercentage > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <BadgePercent className="w-3 h-3 text-emerald-400" />
                          <span className="text-[11px] text-emerald-400 font-medium">{discountPercentage}% {planName} discount applied</span>
                        </div>
                      )}
                      {/* Mobile wallet balance */}
                      <div className="lg:hidden mt-2 text-xs text-white/30">
                        Wallet: ₹{walletBalance}
                      </div>
                    </div>
                    <Button
                      onClick={handleMakeCall}
                      disabled={isLoading || !selectedCelebrity || !recipientName || !recipientPhone || !occasion || !senderName || (callTiming === 'scheduled' && !scheduledDate)}
                      className="h-12 px-8 text-sm font-semibold rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white hover:opacity-90 border-0 w-full sm:w-auto disabled:opacity-40"
                    >
                      {isLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{callTiming === 'scheduled' ? 'Scheduling...' : 'Initiating...'}</>
                      ) : (
                        <>BOOK YOUR CALL <ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>
      </div>

      <CelebrityCallModal
        open={showCelebrityModal}
        onOpenChange={setShowCelebrityModal}
        onSelectCelebrity={setSelectedCelebrity}
        profileId={profile?.id}
      />
    </AuthenticatedLayout>
  );
}
