import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, RotateCcw, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MAX_DURATION_SECONDS = 300; // 5 minutes

interface AudioRecorderButtonProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

export default function AudioRecorderButton({ onRecordingComplete, disabled }: AudioRecorderButtonProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const getMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm';
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([blob], `recorded_audio_${Date.now()}.${ext}`, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        setRecordedFile(file);
        setAudioUrl(url);
        setState('preview');
      };

      recorder.start(1000);
      setState('recording');
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          if (next >= MAX_DURATION_SECONDS) {
            recorder.stop();
            if (timerRef.current) clearInterval(timerRef.current);
            toast({ title: "Maximum recording time reached", description: "Recording stopped at 5 minutes." });
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast({ title: "Microphone access denied", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
      } else {
        toast({ title: "Recording error", description: err.message || "Could not start recording.", variant: "destructive" });
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const reRecord = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordedFile(null);
    setElapsed(0);
    setState('idle');
  }, [audioUrl]);

  const useRecording = useCallback(() => {
    if (recordedFile) {
      onRecordingComplete(recordedFile);
      toast({ title: "Recording selected", description: "Your recorded audio will be used." });
    }
  }, [recordedFile, onRecordingComplete]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (state === 'recording') {
    return (
      <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
          </span>
          <span className="text-sm font-medium text-destructive">Recording...</span>
          <span className="font-mono text-sm text-muted-foreground">{formatTime(elapsed)}</span>
        </div>
        <Button variant="destructive" size="sm" onClick={stopRecording}>
          <Square className="h-4 w-4 mr-1 fill-current" /> Stop Recording
        </Button>
      </div>
    );
  }

  if (state === 'preview' && audioUrl) {
    return (
      <div className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mic className="h-4 w-4" />
          <span>Recorded: {formatTime(elapsed)}</span>
        </div>
        <audio controls src={audioUrl} className="w-full h-10" />
        <div className="flex gap-2">
          <Button variant="default" size="sm" className="flex-1" onClick={useRecording}>
            <Check className="h-4 w-4 mr-1" /> Use This Recording
          </Button>
          <Button variant="outline" size="sm" onClick={reRecord}>
            <RotateCcw className="h-4 w-4 mr-1" /> Re-record
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors">
      <Button variant="outline" size="sm" onClick={startRecording} disabled={disabled}>
        <Mic className="h-4 w-4 mr-1" /> Start Recording
      </Button>
      <p className="text-xs text-muted-foreground">Record directly from your microphone</p>
    </div>
  );
}
