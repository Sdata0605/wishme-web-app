import React from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface VoiceStatusIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
}

export const VoiceStatusIndicator = ({ isListening, isSpeaking }: VoiceStatusIndicatorProps) => {
  if (!isListening && !isSpeaking) return null;

  return (
    <Card className="p-3 mb-4 bg-gradient-card border-primary/20 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3">
        {isListening && (
          <>
            <div className="relative">
              <Mic className="h-5 w-5 text-primary" />
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">Listening...</p>
              <p className="text-xs text-muted-foreground">Speak clearly into your microphone</p>
            </div>
          </>
        )}
        {isSpeaking && (
          <>
            <div className="relative">
              <Volume2 className="h-5 w-5 text-accent" />
              <div className="flex gap-0.5 ml-1">
                <div className="w-1 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-4 bg-accent rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                <div className="w-1 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-accent">AI is speaking...</p>
              <p className="text-xs text-muted-foreground">Listening to the response</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
