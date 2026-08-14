import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Video, CheckCircle, AlertCircle } from "lucide-react";

interface ConsentCaptureProps {
  celebrityId: string;
  onConsentSubmitted: () => void;
}

const CONSENT_TEXT = "I, hereby give my consent to use my image, voice, and likeness for promotional purposes on this platform. I understand that the content I create will be used to generate AI-powered responses and promotional materials. I confirm that I have the legal right to grant this consent.";

export function ConsentCapture({ celebrityId, onConsentSubmitted }: ConsentCaptureProps) {
  const { toast } = useToast();
  const [photoStream, setPhotoStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [photoCapture, setPhotoCapture] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoVideoReady, setPhotoVideoReady] = useState(false);
  const [videoVideoReady, setVideoVideoReady] = useState(false);
  
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const videoVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  // Effect: attach photo stream to video element after render
  useEffect(() => {
    if (photoStream && photoVideoRef.current) {
      photoVideoRef.current.srcObject = photoStream;
      photoVideoRef.current.onloadedmetadata = () => {
        photoVideoRef.current?.play();
        setPhotoVideoReady(true);
      };
    }
  }, [photoStream]);

  // Effect: attach video stream and create MediaRecorder after render
  useEffect(() => {
    if (videoStream && videoVideoRef.current) {
      videoVideoRef.current.srcObject = videoStream;
      videoVideoRef.current.onloadedmetadata = () => {
        videoVideoRef.current?.play();
        setVideoVideoReady(true);
      };

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
      const mediaRecorder = new MediaRecorder(videoStream, { mimeType });
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: mimeType });
        setVideoBlob(blob);
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
        setVideoVideoReady(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    }
  }, [videoStream]);

  const startPhotoCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      setPhotoVideoReady(false);
      setPhotoStream(stream);
    } catch (error: any) {
      console.error('Photo capture error:', error);
      toast({
        title: "Error",
        description: error.message || "Could not access camera",
        variant: "destructive"
      });
    }
  };
  const capturePhoto = () => {
    if (photoVideoRef.current && photoCanvasRef.current && photoVideoReady) {
      const video = photoVideoRef.current;
      const canvas = photoCanvasRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast({
          title: "Error",
          description: "Camera not ready. Please wait a moment and try again.",
          variant: "destructive"
        });
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg', 0.95);
        setPhotoCapture(photoData);
        photoStream?.getTracks().forEach(track => track.stop());
        setPhotoStream(null);
        setPhotoVideoReady(false);
      }
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      setVideoVideoReady(false);
      setVideoStream(stream);
    } catch (error: any) {
      console.error('Video recording error:', error);
      toast({
        title: "Error",
        description: error.message || "Could not access camera/microphone",
        variant: "destructive"
      });
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitConsent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!photoCapture || !videoBlob) {
      toast({
        title: "Error",
        description: "Please capture both photo and video consent",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);

      // Upload photo
      const photoFile = await fetch(photoCapture).then(r => r.blob());
      const photoFileName = `${celebrityId}/consent-photo-${Date.now()}.jpg`;
      const { error: photoError } = await supabase.storage
        .from('verification-docs')
        .upload(photoFileName, photoFile);

      if (photoError) throw photoError;

      const { data: photoUrlData } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(photoFileName);

      // Upload video
      const videoFileName = `${celebrityId}/consent-video-${Date.now()}.webm`;
      const { error: videoError } = await supabase.storage
        .from('verification-docs')
        .upload(videoFileName, videoBlob);

      if (videoError) throw videoError;

      const { data: videoUrlData } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(videoFileName);

      // Update celebrity record
      const { error: updateError } = await supabase
        .from('celebrities')
        .update({
          consent_photo_url: photoUrlData.publicUrl,
          consent_video_url: videoUrlData.publicUrl,
          consent_status: 'submitted',
          consent_given_at: new Date().toISOString()
        })
        .eq('id', celebrityId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Consent submitted successfully. Admin will review it shortly."
      });

      // Call the callback
      onConsentSubmitted();
    } catch (error: any) {
      console.error('Consent submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Could not submit consent",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          To be displayed on the platform, you must provide consent by capturing a live photo and recording a video reading the consent statement.
        </AlertDescription>
      </Alert>

      {/* Photo Consent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Step 1: Capture Photo Consent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!photoStream && !photoCapture && (
            <Button onClick={startPhotoCapture}>
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          )}

          {photoStream && (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={photoVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-w-md rounded-lg border bg-black"
                />
                {!photoVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <span className="text-white">Loading camera...</span>
                  </div>
                )}
              </div>
              <Button onClick={capturePhoto} disabled={!photoVideoReady}>
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo
              </Button>
            </div>
          )}

          {photoCapture && (
            <div className="space-y-4">
              <img src={photoCapture} alt="Consent" className="w-full max-w-md rounded-lg border" />
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span>Photo captured successfully</span>
              </div>
              <Button variant="outline" onClick={() => setPhotoCapture(null)}>Retake Photo</Button>
            </div>
          )}

          <canvas ref={photoCanvasRef} className="hidden" />
        </CardContent>
      </Card>

      {/* Video Consent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Step 2: Record Video Consent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Please read the following statement aloud:</strong>
              <p className="mt-2 italic">{CONSENT_TEXT}</p>
            </AlertDescription>
          </Alert>

          {!videoStream && !videoBlob && (
            <Button onClick={startVideoRecording}>
              <Video className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          )}

          {videoStream && (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-w-md rounded-lg border bg-black"
                  style={{ minHeight: '300px' }}
                />
                {!videoVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <span className="text-white">Loading camera...</span>
                  </div>
                )}
              </div>
              {isRecording && videoVideoReady && (
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                  <span>Recording... (Read the statement aloud)</span>
                </div>
              )}
              <Button 
                onClick={stopVideoRecording} 
                variant="destructive"
                disabled={!videoVideoReady}
              >
                <Video className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
            </div>
          )}

          {videoBlob && (
            <div className="space-y-4">
              <video
                src={URL.createObjectURL(videoBlob)}
                controls
                className="w-full max-w-md rounded-lg border"
              />
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span>Video recorded successfully</span>
              </div>
              <Button variant="outline" onClick={() => setVideoBlob(null)}>Re-record Video</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      {photoCapture && videoBlob && (
        <form onSubmit={submitConsent} className="flex justify-end">
          <Button type="submit" disabled={uploading} size="lg">
            {uploading ? "Submitting..." : "Submit Consent"}
          </Button>
        </form>
      )}
    </div>
  );
}
