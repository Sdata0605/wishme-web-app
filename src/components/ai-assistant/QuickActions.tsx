import React from 'react';
import { ArrowRight } from 'lucide-react';
import { AIAction } from '@/contexts/AIAssistantContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface QuickActionsProps {
  actions: AIAction[];
  onActionClick: (action: AIAction) => void;
}

export const QuickActions = ({ actions, onActionClick }: QuickActionsProps) => {
  if (!actions || actions.length === 0) return null;
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
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => onActionClick(action)}
          className="flex-shrink-0 cursor-pointer flex items-center gap-1.5 transition-all duration-150"
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
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
          }}
        >
          {action.label}
          <ArrowRight style={{ width: isMobile ? 14 : 12, height: isMobile ? 14 : 12 }} />
        </button>
      ))}
    </div>
  );
};
