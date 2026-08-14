import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatBubbleProps {
  onClick: () => void;
  hasUnread?: boolean;
}

export const ChatBubble = ({ onClick, hasUnread = false }: ChatBubbleProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[9998] h-14 w-14 rounded-full flex items-center justify-center cursor-pointer touch-manipulation transition-transform duration-200 hover:scale-[1.08] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)',
              boxShadow: '0 8px 30px rgba(255,107,51,0.4)',
              border: 'none',
            }}
            aria-label="Open AI Assistant"
          >
            {/* Pulse ring */}
            <span
              className="absolute inset-0 rounded-full animate-ping pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)',
                opacity: 0.3,
                animationDuration: '2s',
              }}
            />
            <Sparkles className="h-6 w-6 text-white relative z-10" />
            {hasUnread && (
              <span
                className="absolute top-0 right-0 h-4 w-4 rounded-full"
                style={{
                  background: '#22C55E',
                  border: '2px solid #0A0D14',
                }}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-sm hidden md:block">
          <p>Ask me anything! 🤖</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
