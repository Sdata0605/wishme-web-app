import React from 'react';
import { AIMessage } from '@/contexts/AIAssistantContext';
import { useAINavigation } from '@/hooks/useAINavigation';
import { Bot, User, Mic } from 'lucide-react';
import { QuickActions } from './QuickActions';
import { SuggestionChips } from './SuggestionChips';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface MessageBubbleProps {
  message: AIMessage;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { navigateToRoute } = useAINavigation();
  const { sendMessage } = useAIAssistant();
  const isMobile = useIsMobile();
  const isUser = message.role === 'user';

  const handleActionClick = (action: any) => {
    if (action.type === 'navigate') {
      navigateToRoute(action.data.route);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  if (isMobile) {
    return (
      <div className="flex flex-col gap-1 animate-in slide-in-from-bottom-2 duration-300">
        <div
          className={isUser ? 'self-end' : 'self-stretch'}
          style={{
            maxWidth: isUser ? '88%' : '100%',
            background: isUser
              ? 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)'
              : '#1C2438',
            border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: isUser ? '20px 20px 4px 20px' : '16px',
            padding: '18px 20px',
            boxShadow: isUser ? '0 8px 30px rgba(255,107,51,0.3)' : 'none',
          }}
        >
          <p className="text-white whitespace-pre-wrap leading-relaxed" style={{ fontSize: '16px', lineHeight: '1.6' }}>
            {message.content}
          </p>
          {message.isVoiceInput && (
            <div className="flex items-center gap-1 mt-2 opacity-70">
              <Mic className="h-3 w-3 text-white" />
              <span className="text-white" style={{ fontSize: '11px' }}>Voice message</span>
            </div>
          )}
        </div>

        {message.actions && message.actions.length > 0 && (
          <QuickActions actions={message.actions} onActionClick={handleActionClick} />
        )}
        {message.suggestions && message.suggestions.length > 0 && (
          <SuggestionChips suggestions={message.suggestions} onSuggestionClick={handleSuggestionClick} />
        )}

        <span className={`px-1 ${isUser ? 'text-right' : 'text-left'}`} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  }

  // Desktop
  return (
    <div className={`flex gap-2 animate-in slide-in-from-bottom-2 duration-300 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #FF6B33, #B44CFF)'
            : 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)',
        }}
      >
        {isUser ? (
          <User className="h-3 w-3 text-white" />
        ) : (
          <Bot className="h-3 w-3 text-white" />
        )}
      </div>

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: '82%' }}>
        <div
          style={{
            background: isUser
              ? 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)'
              : '#1C2640',
            border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            padding: '10px 14px',
            boxShadow: isUser ? '0 4px 20px rgba(255,107,51,0.25)' : 'none',
          }}
        >
          <p className="text-white whitespace-pre-wrap" style={{ fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word' }}>
            {message.content}
          </p>
          {message.isVoiceInput && (
            <div className="flex items-center gap-1 mt-1.5 opacity-70">
              <Mic className="h-3 w-3 text-white" />
              <span className="text-white" style={{ fontSize: '10px' }}>Voice</span>
            </div>
          )}
        </div>

        {message.actions && message.actions.length > 0 && (
          <div className="mt-1.5">
            <QuickActions actions={message.actions} onActionClick={handleActionClick} />
          </div>
        )}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-1.5">
            <SuggestionChips suggestions={message.suggestions} onSuggestionClick={handleSuggestionClick} />
          </div>
        )}

        <span
          className="px-1 mt-1"
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
            marginLeft: isUser ? '0' : '0',
            textAlign: isUser ? 'right' : 'left',
            alignSelf: isUser ? 'flex-end' : 'flex-start',
          }}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
