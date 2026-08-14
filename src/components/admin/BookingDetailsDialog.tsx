import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, User, DollarSign, MessageSquare, AlertCircle, CheckCircle, Loader2, Wand2, RefreshCw, Video, Send, Copy, Play, FileText, Star, Clock, Hash, Mail, Phone, Heart } from "lucide-react";
import { BookingStatusBadge } from "@/components/booking/BookingStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { B2VideoPlayer } from "@/components/media/B2VideoPlayer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

interface BookingDetailsDialogProps {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface BookingDetails {
  id: string;
  user_id: string;
  celebrity_id: string;
  service_type: string;
  original_price: number;
  discount_amount: number;
  final_price: number;
  status: string;
  message?: string;
  instructions?: string;
  delivery_date?: string;
  recipient_name?: string;
  recipient_relationship?: string;
  admin_notes?: string;
  generated_prompt?: string;
  script_content?: string;
  generation_status?: string;
  generation_error?: string;
  created_at: string;
  updated_at?: string;
  user_profile?: { first_name?: string; last_name?: string; email?: string; phone?: string };
  celebrity?: { name: string; heygen_avatar_id?: string; heygen_voice_id?: string };
  video_url?: string;
  heygen_video_id?: string;
  video_file_key?: string;
  video_status?: string;
  recipient_verification_code?: string;
  recipient_video_accessed?: boolean;
  recipient_video_accessed_at?: string;
}

export default function BookingDetailsDialog({ bookingId, open, onOpenChange, onUpdate }: BookingDetailsDialogProps) {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const [status, setStatus] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [scriptMode, setScriptMode] = useState<'auto' | 'manual' | 'existing'>('existing');
  const [customScript, setCustomScript] = useState("");
  const [sendingVideo, setSendingVideo] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);

  useEffect(() => {
    if (bookingId && open) {
      fetchBookingDetails();
    }
  }, [bookingId, open]);

  const fetchBookingDetails = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          user_profile:profiles!user_id (first_name, last_name, email, phone),
          celebrity:celebrities!celebrity_id (name, heygen_avatar_id, heygen_voice_id),
          generated_prompt, script_content, generation_status, generation_error
        `)
        .eq('id', bookingId)
        .single();
      if (error) throw error;
      setBooking(data);
      setStatus(data.status);
      setDeliveryDate(data.delivery_date || "");
      setAdminNotes(data.admin_notes || "");
      if (data.script_content) {
        setCustomScript(data.script_content);
        setScriptMode('existing');
      } else {
        const extractedScript = extractScriptFromMessage(data.message);
        if (extractedScript) {
          setCustomScript(extractedScript);
          setScriptMode('existing');
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to load booking details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const extractScriptFromMessage = (message: string | undefined): string => {
    if (!message) return "";
    try {
      const parsed = JSON.parse(message);
      return parsed.scriptBuilder?.talkingPoints || parsed.scriptBuilder?.exactScript || parsed.scriptBuilder?.generatedScript || parsed.step4?.scriptText || parsed.requestDetails?.message || parsed.step1?.message || "";
    } catch {
      return message;
    }
  };

  const validateBookingData = () => {
    const validations: string[] = [];
    const parsedMsg = parseBookingMessage(booking?.message);
    const actualMessage = parsedMsg?.requestDetails?.message || booking?.message || '';
    const hasScript = customScript.trim().length >= 10 || scriptMode === 'auto' || actualMessage.trim().length >= 10;
    if (!hasScript && status === "confirmed" && booking?.service_type !== 'image_promotion') validations.push("Script content is required for confirmation (minimum 10 characters)");
    if (status === "confirmed" && !deliveryDate && !booking?.delivery_date) validations.push("Delivery date is required for confirmed bookings");
    if (deliveryDate) {
      const deliveryDateTime = new Date(deliveryDate);
      if (deliveryDateTime < new Date()) validations.push("Delivery date cannot be in the past");
    }
    if (status === "confirmed" && booking?.celebrity && booking?.service_type !== 'image_promotion') {
      if (!booking.celebrity.heygen_avatar_id || !booking.celebrity.heygen_voice_id) {
        validations.push("Celebrity is missing HeyGen Avatar ID or Voice ID. Please configure in Celebrity Edit page.");
      }
    }
    return validations;
  };

  const handleGenerateScript = async () => {
    if (!booking) return;
    setGeneratingScript(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { bookingId: booking.id, context: booking.message, celebrityName: booking.celebrity?.name }
      });
      if (error) throw error;
      if (data?.script) {
        setCustomScript(data.script);
        setScriptMode('manual');
        toast({ title: "Script Generated", description: "AI has generated a script. You can edit it before approving." });
      }
    } catch (error: any) {
      toast({ title: "Script Generation Failed", description: error.message || "Failed to generate script with AI", variant: "destructive" });
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleApprove = async () => {
    const validationErrors = validateBookingData();
    if (validationErrors.length > 0) {
      toast({ title: "Validation Failed", description: validationErrors.join("; "), variant: "destructive" });
      return;
    }
    setApproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-booking-status", {
        body: {
          bookingId, status: "confirmed",
          deliveryDate: deliveryDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          adminNotes,
          scriptContent: scriptMode === 'manual' ? customScript : (scriptMode === 'existing' ? customScript : null),
          generateScript: scriptMode === 'auto'
        }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to approve booking");
      const isImage = booking?.service_type === 'image_promotion';
      toast({ title: "Order Approved", description: isImage ? "Image generation has been started." : "Video generation has been started. The video will appear automatically when ready." });
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Approval Failed", description: error.message || "Unable to approve order at this time. Please try again.", variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  const handleRetryGeneration = async () => {
    if (!booking) return;
    setApproving(true);
    try {
      if (booking.service_type === 'image_promotion') {
        // Re-trigger image generation via update-booking-status confirmed path
        const { data, error } = await supabase.functions.invoke("update-booking-status", {
          body: { bookingId: booking.id, status: "confirmed", adminNotes: booking.admin_notes || '' }
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Failed to retry image generation");
        toast({ title: "Retry Started", description: "Image generation has been restarted." });
      } else {
        const { data, error } = await supabase.functions.invoke("process-video-order", {
          body: { bookingId: booking.id, scriptContent: customScript || booking.script_content, generateScript: !customScript && !booking.script_content }
        });
        if (error) throw error;
        toast({ title: "Retry Started", description: "Video generation has been restarted." });
      }
      fetchBookingDetails();
    } catch (error: any) {
      toast({ title: "Retry Failed", description: error.message || "Failed to restart generation", variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  const handleCheckVideoStatus = async () => {
    if (!booking?.heygen_video_id) {
      toast({ title: "No Video ID", description: "This booking doesn't have a HeyGen video ID yet.", variant: "destructive" });
      return;
    }
    setApproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('poll-heygen-status', {
        body: { bookingId: booking.id, videoId: booking.heygen_video_id, attemptNumber: 1 }
      });
      if (error) throw error;
      toast({ title: "Status Checked", description: data.message || `Video status: ${data.status}` });
      fetchBookingDetails();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to check video status", variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  const handleUpdate = async () => {
    const validationErrors = validateBookingData();
    if (validationErrors.length > 0) {
      toast({ title: "Validation Failed", description: validationErrors.join("; "), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-booking-status", {
        body: { bookingId, status, deliveryDate: deliveryDate || null, adminNotes, scriptContent: customScript || null }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to update booking");
      toast({ title: "Booking Updated", description: "Changes saved successfully" });
      setEditing(false);
      onUpdate();
      fetchBookingDetails();
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "An error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const parseBookingMessage = (message: string | undefined) => {
    if (!message) return null;
    try {
      const parsed = JSON.parse(message);
      const requestDetails = parsed.requestDetails || parsed.step1 || {};
      const creativeGuidelines = parsed.creativeGuidelines || parsed.step3 || {};
      if (creativeGuidelines.tone && !creativeGuidelines.toneAndStyle) {
        creativeGuidelines.toneAndStyle = creativeGuidelines.tone;
      }
      const scriptBuilder = parsed.scriptBuilder || parsed.step4 || {};
      if (scriptBuilder.scriptText && !scriptBuilder.talkingPoints && !scriptBuilder.exactScript) {
        scriptBuilder.talkingPoints = scriptBuilder.scriptText;
        scriptBuilder.generatedScript = scriptBuilder.scriptText;
      }
      return {
        serviceType: parsed.serviceType || '',
        requestDetails,
        deliveryType: parsed.deliveryType || parsed.step2?.deliveryType || '',
        creativeGuidelines,
        scriptBuilder,
      };
    } catch {
      return null;
    }
  };

  const getGenerationStatusBadge = (genStatus: string | undefined) => {
    if (!genStatus) return null;
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-secondary text-secondary-foreground' },
      script_generating: { label: 'Generating Script...', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      video_generating: { label: 'Creating Video...', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      downloading: { label: 'Downloading...', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
      uploading: { label: 'Uploading...', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      completed: { label: 'Completed', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      failed: { label: 'Failed', className: 'bg-destructive/20 text-destructive border-destructive/30' },
    };
    const style = map[genStatus];
    if (!style) return <Badge variant="outline">{genStatus}</Badge>;
    return <Badge variant="outline" className={style.className}>{style.label}</Badge>;
  };

  if (!booking && !loading) return null;

  const validationErrors = validateBookingData();
  const parsedMessage = parseBookingMessage(booking?.message);

  // Helper: Section card wrapper
  const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-xl border bg-card p-4 sm:p-5 ${className}`}>{children}</div>
  );

  const SectionTitle = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-foreground">{children}</h3>
    </div>
  );

  const InfoRow = ({ label, value, mono = false, className = "" }: { label: string; value: React.ReactNode; mono?: boolean; className?: string }) => (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className={`text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-24px)] md:w-auto max-h-[90vh] overflow-y-auto p-0">
        {/* Sticky Header */}
        <div className="bg-background border-b px-5 py-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg sm:text-xl font-bold">Order Preview</DialogTitle>
              {booking && <BookingStatusBadge booking={booking} showSentTime />}
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Review details and manage this order
            </DialogDescription>
          </DialogHeader>
        </div>

        {loading && (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading order details...</p>
          </div>
        )}

        {booking && (
          <div className="px-5 py-5 space-y-5">
            {/* Validation Warnings */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive" className="border-destructive/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold text-sm mb-1">Please address these issues:</p>
                  <ul className="text-sm list-disc list-inside space-y-0.5">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* ─── ORDER SUMMARY ─── */}
            <SectionCard>
              <SectionTitle icon={Hash}>Order Summary</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoRow label="Order ID" value={booking.id.slice(0, 8) + '...'} mono />
                <InfoRow label="Service" value={
                  <Badge variant="secondary" className="capitalize">{booking.service_type.replace(/_/g, ' ')}</Badge>
                } />
                <InfoRow label="Amount" value={
                  <span className="text-lg font-bold text-primary">₹{booking.final_price.toLocaleString()}</span>
                } />
                <InfoRow label="Created" value={new Date(booking.created_at).toLocaleDateString()} />
              </div>
              {booking.discount_amount > 0 && (
                <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Original: ₹{booking.original_price.toLocaleString()}</span>
                  <span className="text-green-500">Discount: -₹{booking.discount_amount.toLocaleString()}</span>
                </div>
              )}
            </SectionCard>

            {/* ─── CUSTOMER & CELEBRITY (Side by Side) ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <SectionCard>
                <SectionTitle icon={User}>Customer</SectionTitle>
                <div className="space-y-3">
                  <InfoRow label="Name" value={
                    booking.user_profile?.first_name && booking.user_profile?.last_name
                      ? `${booking.user_profile.first_name} ${booking.user_profile.last_name}`
                      : booking.user_profile?.first_name || "Unknown"
                  } />
                  {booking.user_profile?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-foreground">{booking.user_profile.email}</span>
                    </div>
                  )}
                  {booking.user_profile?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-foreground">{booking.user_profile.phone}</span>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Celebrity */}
              <SectionCard className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <SectionTitle icon={Star}>Celebrity</SectionTitle>
                <p className="text-lg font-bold mb-3">{booking.celebrity?.name}</p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">Avatar:</span>
                    {booking.celebrity?.heygen_avatar_id ? (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">✓ Ready</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Missing</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">Voice:</span>
                    {booking.celebrity?.heygen_voice_id ? (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">✓ Ready</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Missing</Badge>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* ─── RECIPIENT INFO (if available) ─── */}
            {parsedMessage && (parsedMessage.requestDetails.recipientName || parsedMessage.requestDetails.recipientRelation || parsedMessage.requestDetails.occasion) && (
              <SectionCard>
                <SectionTitle icon={Heart}>Recipient Details</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {parsedMessage.requestDetails.recipientName && (
                    <InfoRow label="Recipient Name" value={parsedMessage.requestDetails.recipientName} />
                  )}
                  {parsedMessage.requestDetails.recipientRelation && (
                    <InfoRow label="Relationship" value={parsedMessage.requestDetails.recipientRelation} />
                  )}
                  {parsedMessage.requestDetails.occasion && (
                    <InfoRow label="Occasion" value={<span className="capitalize">{parsedMessage.requestDetails.occasion}</span>} />
                  )}
                </div>
              </SectionCard>
            )}

            {/* ─── VIDEO GENERATION ─── */}
            {(booking.generation_status || booking.video_file_key || booking.video_status) && (
              <SectionCard>
                <SectionTitle icon={Video}>Video Pipeline</SectionTitle>

                {/* Pipeline Steps */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {[
                    { key: 'sent', label: 'Sent to HeyGen', done: !!booking.heygen_video_id },
                    { key: 'processing', label: 'Processing', done: ['downloading', 'uploading', 'completed'].includes(booking.generation_status || ''), active: booking.generation_status === 'video_generating' },
                    { key: 'downloaded', label: 'Downloaded', done: ['uploading', 'completed'].includes(booking.generation_status || ''), active: booking.generation_status === 'downloading' },
                    { key: 'stored', label: 'Stored', done: booking.generation_status === 'completed', active: booking.generation_status === 'uploading' },
                    { key: 'ready', label: 'Ready', done: booking.video_status === 'ready' },
                  ].map((step, i) => (
                    <div key={step.key} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-muted-foreground text-xs">→</span>}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                        step.done
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                          : step.active
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 animate-pulse'
                            : 'bg-muted text-muted-foreground border-transparent'
                      }`}>
                        {step.done ? '✓' : step.active ? '◉' : '○'} {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status & HeyGen ID */}
                <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  {getGenerationStatusBadge(booking.generation_status)}
                  {booking.heygen_video_id && (
                    <span className="text-[11px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                      ID: {booking.heygen_video_id}
                    </span>
                  )}
                </div>

                {booking.generation_error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{booking.generation_error}</AlertDescription>
                  </Alert>
                )}

                {/* Video Player */}
                {booking.video_file_key && booking.video_status === 'ready' ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border-2 border-purple-500/20 bg-purple-500/5 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Play className="h-4 w-4 text-purple-500" />
                        <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400">Video Preview</h4>
                      </div>
                      <B2VideoPlayer
                        fileKey={booking.video_file_key}
                        fallbackUrl={booking.video_url}
                        className="w-full rounded-lg"
                      />
                      <div className="mt-3 flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground font-mono flex-1 truncate">
                          {booking.video_file_key}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            navigator.clipboard.writeText(`https://wishmefinal.lovable.app/order/${booking.id}/view`);
                            toast({ title: "Copied", description: "Secure viewing link copied" });
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copy Link
                        </Button>
                      </div>
                    </div>

                    {/* Verification Code */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Verification Code</span>
                        {booking.recipient_verification_code ? (
                          <div className="flex items-center gap-2">
                            <code className="text-base font-mono font-bold tracking-widest bg-background px-3 py-1 rounded border">
                              {booking.recipient_verification_code}
                            </code>
                            <Button variant="outline" size="sm" className="h-7" onClick={() => {
                              navigator.clipboard.writeText(booking.recipient_verification_code || '');
                              toast({ title: "Copied", description: "Verification code copied" });
                            }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={async () => {
                            try {
                              const code = Array.from(crypto.getRandomValues(new Uint8Array(8)))
                                .map(b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
                              const { error } = await supabase.from('bookings').update({ recipient_verification_code: code }).eq('id', booking.id);
                              if (error) throw error;
                              toast({ title: "Code Generated", description: `Code: ${code}` });
                              fetchBookingDetails();
                            } catch (err: any) {
                              toast({ title: "Error", description: err.message, variant: "destructive" });
                            }
                          }}>Generate Code</Button>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Accessed: <strong>{booking.recipient_video_accessed ? 'Yes' : 'No'}</strong></span>
                        {booking.recipient_video_accessed_at && (
                          <span>At: <strong>{new Date(booking.recipient_video_accessed_at).toLocaleString()}</strong></span>
                        )}
                      </div>
                    </div>

                    {/* Send Video Button */}
                    {booking.generation_status === 'completed' && booking.video_status === 'ready' && booking.status !== 'completed' && booking.status !== 'video_sent' && (booking.status as string) !== 'sent' && (
                      <Button
                        onClick={() => setConfirmSendOpen(true)}
                        disabled={sendingVideo}
                        className="w-full h-12 text-sm font-bold bg-green-600 hover:bg-green-700"
                      >
                        {sendingVideo ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" /> Send Video to Customer</>
                        )}
                      </Button>
                    )}

                    {(booking.status === 'completed' || booking.status === 'video_sent' || (booking.status as string) === 'sent') && booking.video_file_key && (
                      <Alert className="border-green-500/20 bg-green-500/5">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700 dark:text-green-300 text-sm font-medium">
                          Video has been sent to the customer.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : booking.generation_status === 'video_generating' || booking.generation_status === 'downloading' || booking.generation_status === 'uploading' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm text-blue-600 dark:text-blue-400">Video is being created — it will appear automatically.</span>
                    </div>
                    <Button onClick={handleCheckVideoStatus} disabled={approving} variant="outline" size="sm" className="text-xs">
                      {approving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                      Force Check Status
                    </Button>
                  </div>
                ) : booking.generation_status === 'failed' && (
                  <div className="flex gap-2">
                    <Button onClick={handleRetryGeneration} disabled={approving} variant="outline" size="sm">
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry Generation
                    </Button>
                    {booking.heygen_video_id && (
                      <Button onClick={handleCheckVideoStatus} disabled={approving} variant="outline" size="sm">
                        {approving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                        Force Check
                      </Button>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground mt-3">
                  Videos are retrieved automatically via webhook. Manual checks are only needed if retrieval fails.
                </p>
              </SectionCard>
            )}

            {/* ─── CUSTOMER MESSAGE & GUIDELINES ─── */}
            {parsedMessage ? (
              <>
                {parsedMessage.requestDetails.message && (
                  <SectionCard>
                    <SectionTitle icon={MessageSquare}>Customer's Message</SectionTitle>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{parsedMessage.requestDetails.message}</p>
                  </SectionCard>
                )}

                {parsedMessage.creativeGuidelines && Object.keys(parsedMessage.creativeGuidelines).length > 0 && (
                  <SectionCard>
                    <SectionTitle icon={FileText}>Creative Guidelines</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {parsedMessage.creativeGuidelines.goal && (
                        <InfoRow label="Goal" value={parsedMessage.creativeGuidelines.goal} />
                      )}
                      {parsedMessage.creativeGuidelines.toneAndStyle && (
                        <InfoRow label="Tone & Style" value={parsedMessage.creativeGuidelines.toneAndStyle} />
                      )}
                      {parsedMessage.creativeGuidelines.thingsToAvoid && parsedMessage.creativeGuidelines.thingsToAvoid.length > 0 && (
                        <InfoRow label="Things to Avoid" value={parsedMessage.creativeGuidelines.thingsToAvoid.join(', ')} className="sm:col-span-2" />
                      )}
                      {parsedMessage.creativeGuidelines.otherInfo && (
                        <InfoRow label="Additional Info" value={parsedMessage.creativeGuidelines.otherInfo} className="sm:col-span-2" />
                      )}
                    </div>
                  </SectionCard>
                )}
              </>
            ) : booking.message && (
              <SectionCard>
                <SectionTitle icon={MessageSquare}>Message</SectionTitle>
                <p className="text-sm whitespace-pre-wrap text-foreground">{booking.message}</p>
              </SectionCard>
            )}

            {booking.instructions && (
              <SectionCard>
                <SectionTitle icon={FileText}>Additional Instructions</SectionTitle>
                <p className="text-sm whitespace-pre-wrap text-foreground">{booking.instructions}</p>
              </SectionCard>
            )}

            {/* ─── SCRIPT BUILDER (Pending only, not for image promotions) ─── */}
            {booking.status === "pending" && booking.service_type !== 'image_promotion' && (
              <SectionCard className="border-primary/20">
                <SectionTitle icon={MessageSquare}>Script for Video</SectionTitle>

                <RadioGroup
                  value={scriptMode}
                  onValueChange={(value: 'auto' | 'manual' | 'existing') => setScriptMode(value)}
                  className="space-y-2 mb-4"
                >
                  {[
                    { value: 'existing', label: 'Use Existing Script', desc: "Use the customer's script (editable)" },
                    { value: 'auto', label: 'Auto-Generate with AI', desc: 'AI creates a script from the request' },
                    { value: 'manual', label: 'Write Custom Script', desc: 'Enter your own script' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                      <RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
                      <div>
                        <span className="text-sm font-medium">{opt.label}</span>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Script Content</Label>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleGenerateScript} disabled={generatingScript}>
                      {generatingScript ? (
                        <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Generating...</>
                      ) : (
                        <><Wand2 className="h-3 w-3 mr-1.5" /> Generate with AI</>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={customScript}
                    onChange={(e) => { setCustomScript(e.target.value); if (scriptMode === 'auto') setScriptMode('manual'); }}
                    placeholder={scriptMode === 'auto' ? "AI will generate automatically on approval..." : "Enter the script for the video..."}
                    rows={5}
                    className="font-mono text-xs"
                    disabled={scriptMode === 'auto'}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {customScript.length} chars • Recommended: 75–150 words (30–60s video)
                  </p>
                </div>
              </SectionCard>
            )}

            {/* ─── ADMIN CONTROLS ─── */}
            <SectionCard className="border-primary/10 bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={DollarSign}>Admin Controls</SectionTitle>
                {!editing && booking.status !== "pending" && (
                  <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="text-xs h-7">
                    Edit
                  </Button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">⏳ Pending Review</SelectItem>
                          <SelectItem value="confirmed">✅ Confirmed</SelectItem>
                          <SelectItem value="video_sent">📤 Video Sent</SelectItem>
                          <SelectItem value="completed">✅ Completed</SelectItem>
                          <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                          <SelectItem value="failed">⚠️ Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Delivery Date</Label>
                      <Input type="datetime-local" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="h-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Admin Notes</Label>
                    <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Internal notes (not visible to customer)" rows={2} className="text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdate} disabled={loading || validationErrors.length > 0} size="sm">Save Changes</Button>
                    <Button variant="outline" onClick={() => setEditing(false)} size="sm">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Order Status" value={<BookingStatusBadge booking={booking} showSentTime />} />
                    <InfoRow label="Delivery Date" value={
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">
                          {booking.delivery_date
                            ? new Date(booking.delivery_date).toLocaleString()
                            : new Date(booking.created_at).toLocaleString() + " (auto)"}
                        </span>
                      </div>
                    } />
                  </div>

                  {booking.admin_notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Admin Notes</p>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="whitespace-pre-wrap text-sm">{booking.admin_notes}</p>
                      </div>
                    </div>
                  )}

                  {booking.status === "pending" && (
                    <Alert className="border-green-500/20 bg-green-500/5">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm text-green-700 dark:text-green-300">
                        {booking.service_type === 'image_promotion' 
                          ? 'This is an image promotion order. Approving will generate an AI promotional image.'
                          : 'This booking is pending approval. Review details and configure the script before approving.'
                        }
                      </AlertDescription>
                    </Alert>
                  )}

                  {booking.status === "pending" && (
                    <Button
                      onClick={handleApprove}
                      disabled={approving || validationErrors.length > 0}
                      className="w-full h-12 text-sm font-bold bg-green-600 hover:bg-green-700"
                    >
                      {approving ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                      ) : (
                        <><CheckCircle className="h-4 w-4 mr-2" /> {booking.service_type === 'image_promotion' ? 'APPROVE ORDER & GENERATE IMAGE' : 'APPROVE ORDER & START VIDEO'}</>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </SectionCard>

            {/* ─── METADATA FOOTER ─── */}
            <div className="border-t pt-4 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
              <span><strong>ID:</strong> {booking.id}</span>
              <span><strong>Created:</strong> {new Date(booking.created_at).toLocaleString()}</span>
              <span><strong>Updated:</strong> {new Date(booking.updated_at || booking.created_at).toLocaleString()}</span>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Send Video Confirmation */}
      <AlertDialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Video to Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Send this video to {booking?.user_profile?.first_name || 'the customer'}? They will receive an email and WhatsApp message with the download link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!booking) return;
                setSendingVideo(true);
                try {
                  const { error: sendError } = await supabase.functions.invoke('send-order-notification', {
                    body: { bookingId: booking.id, type: 'video_sent' }
                  });
                  if (sendError) throw sendError;
                  const { error: updateError } = await supabase
                    .from('bookings')
                    .update({ status: 'video_sent' as any, video_sent_at: new Date().toISOString(), video_sent_by: profile?.id || null })
                    .eq('id', booking.id);
                  if (updateError) throw updateError;
                  toast({ title: "Video Sent!", description: `Video sent to ${booking.user_profile?.first_name || 'customer'}` });
                  fetchBookingDetails();
                  onUpdate();
                } catch (err: any) {
                  toast({ title: "Send Failed", description: err.message, variant: "destructive" });
                } finally {
                  setSendingVideo(false);
                  setConfirmSendOpen(false);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
