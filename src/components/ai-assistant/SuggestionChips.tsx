import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SuggestionChipsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export const SuggestionChips = ({ suggestions, onSuggestionClick }: SuggestionChipsProps) => {
  if (!suggestions || suggestions.length === 0) return null;
  const isMobile = useIsMobile();

  return (
    <div
      className={`animate-in slide-in-from-bottom-2 duration-300 ${
        isMobile
          ? 'flex gap-2.5 overflow-x-auto no-scrollbar'
          : 'flex flex-wrap gap-1.5'
      }`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSuggestionClick(suggestion)}
          className="flex-shrink-0 cursor-pointer transition-all duration-150"
          style={{
            background: isMobile ? '#1C2438' : '#1C2640',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '100px',
            padding: isMobile ? '10px 18px' : '6px 14px',
            fontSize: isMobile ? '14px' : '12px',
            color: 'rgba(255,255,255,0.7)',
            whiteSpace: 'nowrap',
            minHeight: isMobile ? '40px' : 'auto',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,107,51,0.4)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.background = 'rgba(255,107,51,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            e.currentTarget.style.background = isMobile ? '#1C2438' : '#1C2640';
          }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};
