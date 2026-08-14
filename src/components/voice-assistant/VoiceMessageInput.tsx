import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useGoogleSpeech } from "@/hooks/useGoogleSpeech";
import { toast } from "sonner";

interface VoiceMessageInputProps {
  onTranscript: (text: string) => void;
  language?: string;
}

export const VoiceMessageInput = ({ onTranscript, language = 'en-US' }: VoiceMessageInputProps) => {
  const [transcript, setTranscript] = useState("");

  const { isListening, isSupported, start, stop } = useGoogleSpeech({
    onTranscript: (text) => {
      setTranscript(text);
      onTranscript(text);
    },
    continuous: true,
    language
  });

  const handleToggle = async () => {
    if (isListening) {
      stop();
    } else {
      if (!isSupported) {
        toast.error("Voice input not supported in this browser. Please use Chrome or Edge.");
        return;
      }
      await start();
    }
  };

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "outline"}
      size="icon"
      onClick={handleToggle}
      disabled={!isSupported}
      className="shrink-0"
      title={isListening ? "Stop recording" : "Start voice input"}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};
