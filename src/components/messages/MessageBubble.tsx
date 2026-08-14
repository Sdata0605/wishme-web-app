import { Message } from "@/hooks/useMessages";
import { Bot, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  senderAvatar?: string;
  senderName?: string;
  showAvatar?: boolean;
}

export function MessageBubble({ message, isOwnMessage, senderAvatar, senderName, showAvatar = true }: MessageBubbleProps) {
  // Extract image URL from message text if present
  const imageUrlMatch = message.message_text.match(/\[Greeting Card: (https?:\/\/[^\]]+)\]/);
  const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
  const textWithoutImage = imageUrl
    ? message.message_text.replace(/\[Greeting Card: https?:\/\/[^\]]+\]/, '').trim()
    : message.message_text;

  const isSending = message.id.startsWith('temp-');
  const timeStr = format(new Date(message.created_at), 'h:mm a');

  if (isOwnMessage) {
    return (
      <div className="flex flex-col items-end max-w-[80%] sm:max-w-[70%] ml-auto mb-1">
        <div
          className="px-4 py-2.5"
          style={{
            background: 'var(--gradient-message-sent)',
            borderRadius: '18px 18px 4px 18px',
          }}
        >
          {textWithoutImage && (
            <p className="text-[14px] text-white whitespace-pre-wrap break-words leading-relaxed">
              {textWithoutImage}
            </p>
          )}
          {imageUrl && (
            <div className={`${textWithoutImage ? 'mt-2' : ''} rounded-lg overflow-hidden`}>
              <img src={imageUrl} alt="Greeting Card" className="w-full h-auto max-w-xs" loading="lazy" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {timeStr}
          </span>
          {isSending ? (
            <span className="text-[10px]" style={{ color: 'hsl(var(--foreground) / 0.3)' }}>⏳</span>
          ) : (
            <span className="text-[10px]" style={{ color: 'hsl(var(--message-read))' }}>✓✓</span>
          )}
        </div>
      </div>
    );
  }

  // AI reply has a distinct style
  const isAI = message.is_ai_generated;

  return (
    <div className="flex gap-2 max-w-[80%] sm:max-w-[70%] mr-auto mb-1">
      {showAvatar ? (
        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 self-end bg-white/10">
          {senderAvatar ? (
            <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-white font-semibold">
              {senderName?.[0]}
            </div>
          )}
        </div>
      ) : (
        <div className="w-7 shrink-0" />
      )}
      <div className="flex flex-col items-start">
        <div
          className="px-4 py-2.5"
          style={{
            background: isAI ? 'hsl(var(--message-bubble-ai))' : 'hsl(var(--message-bubble))',
            border: isAI ? '1px solid hsl(var(--secondary) / 0.2)' : '1px solid hsl(var(--border) / 0.5)',
            borderRadius: '18px 18px 18px 4px',
          }}
        >
          {isAI && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3 h-3" style={{ color: 'hsl(var(--secondary))' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--secondary))' }}>
                AI Reply
              </span>
            </div>
          )}
          {textWithoutImage && (
            <p className="text-[14px] text-white whitespace-pre-wrap break-words leading-relaxed">
              {textWithoutImage}
            </p>
          )}
          {imageUrl && (
            <div className={`${textWithoutImage ? 'mt-2' : ''} rounded-lg overflow-hidden`}>
              <img src={imageUrl} alt="Greeting Card" className="w-full h-auto max-w-xs" loading="lazy" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 px-1">
          {isAI && (
            <span className="text-[10px]" style={{ color: 'rgba(167,139,250,0.6)' }}>
              AI Reply ·
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {timeStr}
          </span>
        </div>
      </div>
    </div>
  );
}
