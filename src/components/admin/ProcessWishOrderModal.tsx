import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Upload, Video, Image as ImageIcon, Send } from "lucide-react";

interface ProcessWishOrderModalProps {
  open: boolean;
  onClose: () => void;
  booking: any;
  celebrity: any;
  onSuccess: () => void;
}

export function ProcessWishOrderModal({
  open,
  onClose,
  booking,
  celebrity,
  onSuccess
}: ProcessWishOrderModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("script");
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState("");
  const [videoMethod, setVideoMethod] = useState<'heygen' | 'manual'>('heygen');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [cardPrompt, setCardPrompt] = useState("");
  const [generatedCardUrl, setGeneratedCardUrl] = useState("");
  const [generatingCard, setGeneratingCard] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [adminNotes, setAdminNotes] = useState(booking?.admin_notes || "");

  const generateScript = async () => {
    try {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: `Create a warm, heartfelt ${booking.recipient_relationship || 'friend'} wish from ${celebrity.name} to ${booking.recipient_name} for ${booking.message}. Tone: Personal and genuine. Length: 30 seconds when spoken naturally. Include natural pauses for video delivery.`
        }
      });

      if (error) throw error;
      setScript(data.message || '');
      toast({
        title: "Script Generated",
        description: "Review and edit the script as needed"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not generate script",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateVideoWithHeyGen = async () => {
    if (!celebrity.heygen_avatar_id || !celebrity.heygen_voice_id) {
      toast({
        title: "Configuration Missing",
        description: "Celebrity's HeyGen Avatar ID and Voice ID must be configured",
        variant: "destructive"
      });
      return;
    }

    try {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-heygen-video', {
        body: {
          script,
          avatarId: celebrity.heygen_avatar_id,
          voiceId: celebrity.heygen_voice_id,
          bookingId: booking.id
        }
      });

      if (error) throw error;
      
      toast({
        title: "Video Generation Started",
        description: "Checking status..."
      });
      
      // Poll for video completion
      const videoId = data.videoId;
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max (10 second intervals)
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const { data: statusData, error: statusError } = await supabase.functions.invoke('check-heygen-video-status', {
            body: {
              videoId,
              bookingId: booking.id
            }
          });

          if (statusError) throw statusError;

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            setVideoUrl(statusData.videoUrl);
            toast({
              title: "Video Ready!",
              description: "HeyGen video generated successfully"
            });
            setGenerating(false);
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            throw new Error('Video generation failed');
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            toast({
              title: "Processing...",
              description: "Video is still generating. Check back later.",
              variant: "default"
            });
            setGenerating(false);
          }
        } catch (pollError: any) {
          clearInterval(pollInterval);
          console.error('Polling error:', pollError);
          setGenerating(false);
        }
      }, 10000); // Poll every 10 seconds
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not generate video",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    try {
      setUploadingVideo(true);
      const fileName = `${booking.id}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('celebrity-wish-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('celebrity-wish-videos')
        .getPublicUrl(fileName);

      setVideoUrl(urlData.publicUrl);
      
      await supabase
        .from('bookings')
        .update({
          video_url: urlData.publicUrl,
          video_generation_method: 'manual_upload'
        })
        .eq('id', booking.id);

      toast({
        title: "Video Uploaded",
        description: "Video saved successfully"
      });
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

  const generateCard = async () => {
    try {
      setGeneratingCard(true);
      const prompt = cardPrompt || `Create a beautiful greeting card for ${booking.recipient_name} from ${celebrity.name}. Occasion: ${booking.message}. Style: Elegant and festive.`;
      
      const { data, error } = await supabase.functions.invoke('generate-greeting-card-ai', {
        body: {
          prompt,
          recipientName: booking.recipient_name,
          senderName: celebrity?.name || 'Wish Me',
          occasionName: booking.message,
          refinePrompt: false
        }
      });

      if (error) throw error;
      const cardUrl =
        data?.generation?.generated_image_url ??
        data?.card_url ??
        data?.cardUrl;
      if (!cardUrl) throw new Error('No image returned');
      setGeneratedCardUrl(cardUrl);
      
      toast({
        title: "Card Generated",
        description: "Greeting card created successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not generate card",
        variant: "destructive"
      });
    } finally {
      setGeneratingCard(false);
    }
  };

  const handleComplete = async () => {
    if (!videoUrl || !generatedCardUrl) {
      toast({
        title: "Incomplete",
        description: "Both video and card must be generated",
        variant: "destructive"
      });
      return;
    }

    try {
      setCompleting(true);
      
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          video_url: videoUrl,
          card_url: generatedCardUrl,
          admin_notes: adminNotes,
          completed_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Order Completed",
        description: "User has been notified"
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not complete order",
        variant: "destructive"
      });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Wish Order</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="script">1. Script</TabsTrigger>
            <TabsTrigger value="video">2. Video</TabsTrigger>
            <TabsTrigger value="card">3. Card</TabsTrigger>
          </TabsList>

          {/* Script Tab */}
          <TabsContent value="script" className="space-y-4">
            <Card className="p-4 bg-muted">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Recipient:</span> <strong>{booking.recipient_name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Relationship:</span> <strong>{booking.recipient_relationship || 'Friend'}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Message:</span> <strong>{booking.message}</strong>
                </div>
              </div>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Generated Script</Label>
                <Button onClick={generateScript} disabled={generating} size="sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generating ? "Generating..." : "Generate with AI"}
                </Button>
              </div>
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Click 'Generate with AI' to create a script..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button onClick={() => setActiveTab("video")} disabled={!script} className="w-full">
              Next: Generate Video
            </Button>
          </TabsContent>

          {/* Video Tab */}
          <TabsContent value="video" className="space-y-4">
            <div className="space-y-4">
              <Label>Video Generation Method</Label>
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`p-4 cursor-pointer border-2 ${videoMethod === 'heygen' ? 'border-primary' : 'border-muted'}`}
                  onClick={() => setVideoMethod('heygen')}
                >
                  <div className="text-center">
                    <Video className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-semibold">HeyGen API</p>
                    <p className="text-xs text-muted-foreground mt-1">Generate automatically</p>
                  </div>
                </Card>
                <Card 
                  className={`p-4 cursor-pointer border-2 ${videoMethod === 'manual' ? 'border-primary' : 'border-muted'}`}
                  onClick={() => setVideoMethod('manual')}
                >
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-semibold">Manual Upload</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload existing video</p>
                  </div>
                </Card>
              </div>

              {videoMethod === 'heygen' && (
                <div>
                  {celebrity.heygen_avatar_id && celebrity.heygen_voice_id ? (
                    <div className="space-y-2">
                      <Badge variant="outline" className="mb-2">
                        Avatar: {celebrity.heygen_avatar_id}
                      </Badge>
                      <Badge variant="outline" className="ml-2 mb-2">
                        Voice: {celebrity.heygen_voice_id}
                      </Badge>
                      <Button onClick={generateVideoWithHeyGen} disabled={generating} className="w-full">
                        {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
                        {generating ? "Generating..." : "Generate Video"}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ Celebrity's HeyGen Avatar ID and Voice ID must be configured in Celebrity Edit page
                      </p>
                    </div>
                  )}
                </div>
              )}

              {videoMethod === 'manual' && (
                <div>
                  <Label htmlFor="video-upload">Upload Video (MP4, MOV - Max 50MB)</Label>
                  <Input
                    id="video-upload"
                    type="file"
                    accept="video/mp4,video/quicktime"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setVideoFile(file);
                        handleVideoUpload(file);
                      }
                    }}
                    disabled={uploadingVideo}
                  />
                </div>
              )}

              {videoUrl && (
                <div className="border rounded-lg p-4">
                  <video src={videoUrl} controls className="w-full rounded" />
                </div>
              )}
            </div>

            <Button onClick={() => setActiveTab("card")} disabled={!videoUrl} className="w-full">
              Next: Generate Card
            </Button>
          </TabsContent>

          {/* Card Tab */}
          <TabsContent value="card" className="space-y-4">
            <div>
              <Label>Card Prompt (Editable)</Label>
              <Textarea
                value={cardPrompt}
                onChange={(e) => setCardPrompt(e.target.value)}
                placeholder={`Create a beautiful greeting card for ${booking.recipient_name} from ${celebrity.name}...`}
                rows={4}
              />
            </div>

            <Button onClick={generateCard} disabled={generatingCard} className="w-full">
              {generatingCard ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
              {generatingCard ? "Generating..." : "Generate Card"}
            </Button>

            {generatedCardUrl && (
              <div className="border rounded-lg p-4">
                <img src={generatedCardUrl} alt="Generated Card" className="w-full rounded" />
              </div>
            )}

            {/* Admin Notes */}
            <div>
              <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin_notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any processing notes or special instructions..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleComplete} 
              disabled={!videoUrl || !generatedCardUrl || completing} 
              className="w-full"
              variant="default"
            >
              {completing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {completing ? "Completing..." : "Mark as Complete & Notify User"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}