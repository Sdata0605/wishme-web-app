import React from 'react';
import { cn } from '@/lib/utils';

interface ListeningAnimationProps {
  isListening: boolean;
  isSpeaking: boolean;
  className?: string;
}

export const ListeningAnimation: React.FC<ListeningAnimationProps> = ({
  isListening,
  isSpeaking,
  className
}) => {
  const getStateColor = () => {
    if (isListening) return 'hsl(var(--primary))'; // Blue when listening
    if (isSpeaking) return 'hsl(var(--chart-2))'; // Green when speaking
    return 'hsl(var(--muted))'; // Gray when ready
  };

  const stateColor = getStateColor();

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Pulsing rings */}
      {isListening && (
        <>
          <div 
            className="absolute rounded-full animate-ping opacity-75"
            style={{
              width: '120px',
              height: '120px',
              backgroundColor: stateColor,
              animationDuration: '1.5s'
            }}
          />
          <div 
            className="absolute rounded-full animate-ping opacity-50"
            style={{
              width: '140px',
              height: '140px',
              backgroundColor: stateColor,
              animationDuration: '2s',
              animationDelay: '0.3s'
            }}
          />
          <div 
            className="absolute rounded-full animate-ping opacity-25"
            style={{
              width: '160px',
              height: '160px',
              backgroundColor: stateColor,
              animationDuration: '2.5s',
              animationDelay: '0.6s'
            }}
          />
        </>
      )}

      {/* Rotating gradient ring */}
      {(isListening || isSpeaking) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="rounded-full animate-spin"
            style={{
              width: '100px',
              height: '100px',
              background: `conic-gradient(from 0deg, ${stateColor}, transparent 180deg, ${stateColor})`,
              opacity: 0.3,
              animationDuration: '2s'
            }}
          />
        </div>
      )}

      {/* Static glow for speaking state */}
      {isSpeaking && (
        <div 
          className="absolute rounded-full animate-pulse"
          style={{
            width: '100px',
            height: '100px',
            backgroundColor: stateColor,
            opacity: 0.2,
            animationDuration: '1s'
          }}
        />
      )}
    </div>
  );
};
