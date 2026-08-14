import { useState, useEffect, useRef, useCallback } from "react";
import { useMessages } from "@/hooks/useMessages";
import { useTypingPresence } from "@/hooks/useTypingPresence";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessageBubble } from "./MessageBubble";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { Send, ArrowLeft, Sparkles, Bot, Plus, Phone, Video, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Conversation } from "@/hooks/useConversations";
import { format, isToday, isYesterday } from "date-fns";

interface ChatViewProps {
  conversation: Conversation | null;
  onBack?: () => void;
}

function DateSeparator({ date }: { date: Date }) {
  let label = format(date, 'MMM d');
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';

  return (
    <div className="flex items-center justify-center my-4">
      <span
        className="text-[11px] uppercase tracking-wider px-4 py-1 rounded-full"
        style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}
      >
        {label}
      </span>
    </div>
  );
}

export function ChatView({ conversation, onBack }: ChatViewProps) {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [messageText, setMessageText] = useState("");
  const {
    messages,
    loading,
    sending,
    isTyping,
    hasMoreMessages,
    loadingOlder,
    isClosed,
    sendMessage,
    fetchOlderMessages
  } = useMessages(conversation?.id || null);

  const { otherIsTyping: presenceTyping, broadcastTyping, stopTyping } = useTypingPresence({
    conversationId: conversation?.id || null,
    participantId: profile?.id,
    participantType: 'user',
  });

  // Combine post-send typing indicator with real-time presence typing
  const showTyping = isTyping || presenceTyping;

  const viewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevMessagesLengthRef = useRef(0);

  const scrollToBottom = useCallback((smooth = false) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (smooth) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    } else {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (conversation?.id) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [conversation?.id, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { scrollHeight, scrollTop, clientHeight } = viewport;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 80);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;
    if (!isNewMessage) return;
    const lastMessage = messages[messages.length - 1];
    const isFromUser = lastMessage.sender_type === 'user';
    if (isFromUser || isAtBottom) {
      setTimeout(() => scrollToBottom(true), 50);
    }
  }, [messages, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (showTyping && isAtBottom) {
      setTimeout(() => scrollToBottom(true), 50);
    }
  }, [showTyping, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (!isMobile) return;

    const handleViewportResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      if (window.innerHeight - viewport.height > 100) {
        setTimeout(() => scrollToBottom(false), 40);
      }
    };

    const handleFocus = () => {
      setTimeout(() => {
        scrollToBottom(false);
      }, 250);
    };

    window.visualViewport?.addEventListener('resize', handleViewportResize);
    textareaRef.current?.addEventListener('focus', handleFocus);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      textareaRef.current?.removeEventListener('focus', handleFocus);
    };
  }, [isMobile, scrollToBottom]);

  const loadOlderWithPosition = useCallback(async () => {
    const viewport = viewportRef.current;
    if (!viewport || !hasMoreMessages || loadingOlder) return;
    const prevScrollHeight = viewport.scrollHeight;
    const prevScrollTop = viewport.scrollTop;
    await fetchOlderMessages();
    setTimeout(() => {
      if (viewport) {
        const newScrollHeight = viewport.scrollHeight;
        viewport.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
      }
    }, 0);
  }, [hasMoreMessages, loadingOlder, fetchOlderMessages]);

  useEffect(() => {
    if (!topSentinelRef.current || !viewportRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreMessages && !loadingOlder) {
          loadOlderWithPosition();
        }
      },
      { threshold: 1.0, root: viewportRef.current }
    );
    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreMessages, loadingOlder, loadOlderWithPosition]);

  const handleTextareaInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }, []);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;
    const text = messageText;
    setMessageText("");
    stopTyping();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      await sendMessage(text);
    } catch {
      toast.error("Failed to send message. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  if (!conversation) return null;

  const celebrity = conversation.celebrity;

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  messages.forEach((msg) => {
    const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateKey) {
      last.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'hsl(var(--message-shell))' }}>
      {/* ─── Chat Header ─── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4"
        style={{
          height: 56,
          background: 'hsl(var(--message-sidebar))',
          borderBottom: '1px solid hsl(var(--border) / 0.5)',
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
            style={{ minHeight: 44, minWidth: 44 }}
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white/10">
          {celebrity?.image_url ? (
            <img src={celebrity.image_url} alt={celebrity.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-semibold">
              {celebrity?.name?.[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-white truncate">{celebrity?.name}</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--message-success))' }} />
            <span className="text-[11px] font-medium" style={{ color: 'hsl(var(--message-success))' }}>
              ONLINE NOW
            </span>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ minHeight: 44, minWidth: 44 }}>
            <Video className="w-[18px] h-[18px] text-white/50" />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ minHeight: 44, minWidth: 44 }}>
            <Phone className="w-[18px] h-[18px] text-white/50" />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ minHeight: 44, minWidth: 44 }}>
            <MoreVertical className="w-[18px] h-[18px] text-white/50" />
          </button>
        </div>
      </div>

      {/* ─── AI Agent Banner ─── */}
      <div
        className="shrink-0 mx-4 mt-3 mb-1 px-4 py-3 flex items-start gap-3"
        style={{
          background: 'hsl(var(--secondary) / 0.14)',
          border: '1px solid hsl(var(--secondary) / 0.22)',
          borderRadius: 12,
        }}
      >
        <Bot className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--secondary))' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-white">AI Agent is active</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Your AI twin is currently handling initial inquiries. You can jump in at any time to take over the conversation.
          </p>
        </div>
      </div>

      {/* ─── Messages Area ─── */}
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="px-4 py-4 space-y-0.5" style={{ paddingBottom: isMobile ? 16 : 32 }}>
          {hasMoreMessages && <div ref={topSentinelRef} className="h-1" />}

          {loadingOlder && (
            <div className="text-center py-2">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading older messages...</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-4 bg-white/10">
                {celebrity?.image_url ? (
                  <img src={celebrity.image_url} alt={celebrity.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-white font-semibold">
                    {celebrity?.name?.[0]}
                  </div>
                )}
              </div>
              <p className="text-white text-base">Say hello to {celebrity?.name}</p>
            </div>
          ) : (
            <>
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <DateSeparator date={new Date(group.date)} />
                  <div className="space-y-0.5">
                    {group.messages.map((message, idx) => {
                      const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                      const showAvatar = !prevMsg || prevMsg.sender_type !== message.sender_type;
                      return (
                        <div key={message.id} className="animate-in fade-in-50 duration-150">
                          <MessageBubble
                            message={message}
                            isOwnMessage={message.sender_type === 'user'}
                            senderAvatar={
                              message.sender_type === 'user'
                                ? profile?.avatar_url
                                : celebrity?.image_url
                            }
                            senderName={
                              message.sender_type === 'user'
                                ? `${profile?.first_name} ${profile?.last_name}`
                                : celebrity?.name
                            }
                            showAvatar={showAvatar}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {showTyping && (
                <div className="flex gap-2 max-w-[70%] mr-auto animate-in slide-in-from-left-2 mb-1">
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 self-end bg-white/10">
                    {celebrity?.image_url && (
                      <img src={celebrity.image_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <div
                      className="px-4 py-3"
                      style={{
                        background: 'hsl(var(--message-bubble-ai))',
                        border: '1px solid hsl(var(--secondary) / 0.2)',
                        borderRadius: '18px 18px 18px 4px',
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(var(--secondary))', animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(var(--secondary))', animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(var(--secondary))', animationDelay: '300ms' }} />
                      </div>
                    </div>
                    <span className="text-[10px] mt-0.5 px-1" style={{ color: 'rgba(167,139,250,0.6)' }}>
                      {presenceTyping ? `${celebrity?.name || 'Celebrity'} is typing...` : 'AI is typing...'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ─── Quick actions for empty chat ─── */}
      {messages.length === 0 && !loading && (
        <div className="shrink-0 px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Say hi 👋", text: "Hi! How are you?" },
              { label: "Ask about projects", text: "What are you working on?" },
              { label: "Send appreciation ⭐", text: "I'm a huge fan of your work!" },
            ].map((action, i) => (
              <button
                key={i}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-white/70 flex items-center gap-1 transition-colors hover:text-white"
                style={{ background: '#1C2438', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => {
                  setMessageText(action.text);
                  textareaRef.current?.focus();
                }}
              >
                <Sparkles className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Input Area ─── */}
      <div
        className="shrink-0 sticky bottom-0 z-20"
        style={{
          background: 'hsl(var(--message-sidebar))',
          borderTop: '1px solid hsl(var(--border) / 0.5)',
          padding: '10px 12px',
          paddingBottom: isMobile ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : '12px',
        }}
      >
        {isClosed && (
          <div className="mb-3 p-3 rounded-xl text-center text-sm" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>
            This conversation has been closed. Message limit reached.
          </div>
        )}
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2"
          style={{
            background: 'hsl(var(--message-panel))',
            border: '1px solid hsl(var(--border) / 0.65)',
          }}
        >
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 self-end"
            style={{ background: 'hsl(var(--foreground) / 0.06)', minHeight: 44, minWidth: 44 }}
          >
            <Plus className="w-4 h-4 text-white/50" />
          </button>
          <textarea
            ref={textareaRef}
            placeholder={isClosed ? "Conversation closed..." : `Message ${celebrity?.name || ''}...`}
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTextareaInput();
              if (e.target.value.trim()) broadcastTyping();
              else stopTyping();
            }}
            onKeyDown={handleKeyDown}
            disabled={sending || isClosed}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-white resize-none leading-relaxed placeholder:text-white/30"
            style={{
              fontSize: 16,
              minHeight: 24,
              maxHeight: 120,
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              WebkitUserSelect: 'text',
              userSelect: 'text',
            }}
          />
          <EmojiPickerButton onEmojiSelect={handleEmojiSelect} />
          <button
            onClick={handleSend}
            disabled={sending || !messageText.trim() || isClosed}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 self-end transition-opacity disabled:opacity-30"
            style={{
              background: messageText.trim() && !isClosed
                ? 'var(--gradient-message-sent)'
                : 'hsl(var(--foreground) / 0.08)',
              minHeight: 44,
              minWidth: 44,
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
