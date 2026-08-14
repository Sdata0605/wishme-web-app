import React from 'react';

interface TypingIndicatorProps {
  celebrityName?: string;
}

export const TypingIndicator = ({ celebrityName }: TypingIndicatorProps) => {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-muted max-w-[85%]">
      <div className="flex gap-1">
        <div 
          className="w-2 h-2 rounded-full bg-primary animate-bounce" 
          style={{ animationDelay: '0ms', animationDuration: '1s' }} 
        />
        <div 
          className="w-2 h-2 rounded-full bg-primary animate-bounce" 
          style={{ animationDelay: '150ms', animationDuration: '1s' }} 
        />
        <div 
          className="w-2 h-2 rounded-full bg-primary animate-bounce" 
          style={{ animationDelay: '300ms', animationDuration: '1s' }} 
        />
      </div>
      <span className="text-xs text-muted-foreground ml-1">
        {celebrityName ? `${celebrityName} is typing...` : 'Typing...'}
      </span>
    </div>
  );
};
