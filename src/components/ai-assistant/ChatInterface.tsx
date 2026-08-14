import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Send, 
  Trash2, 
  Sparkles, 
  Mic, 
  Keyboard, 
  Maximize2, 
  Minimize2, 
  History as HistoryIcon,
  ArrowUp
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { VoiceStatusIndicator } from './VoiceStatusIndicator';
import { ConversationHistory } from './ConversationHistory';
import { PreferencesDialog } from './PreferencesDialog';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface ChatInterfaceProps {
  onClose: () => void;
}

export const ChatInterface = ({ onClose }: ChatInterfaceProps) => {
  const { messages, isLoading, sendMessage, clearMessages, voiceState, loadConversation, startNewConversation, mode, setMode } = useAIAssistant();
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startY: number; currentY: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isMinimized && inputRef.current && !isMobile) {
      inputRef.current.focus();
    }
  }, [isMinimized, isMobile]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    await sendMessage(input, inputMode === 'voice');
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const quickActions = [
    'Book a Celebrity',
    'My Bookings',
    'Wallet Balance',
    'How it works',
  ];

  const toggleMinimize = () => setIsMinimized(!isMinimized);
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
  const toggleHistory = () => setShowHistory(!showHistory);

  const handleSelectConversation = async (conversationId: string) => {
    await loadConversation(conversationId);
    setShowHistory(false);
  };

  const handleNewConversation = () => {
    startNewConversation();
    setShowHistory(false);
  };

  // Drag to close (mobile)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragRef.current = { startY: e.touches[0].clientY, currentY: 0 };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current || !sheetRef.current) return;
    const deltaY = e.touches[0].clientY - dragRef.current.startY;
    if (deltaY > 0) {
      dragRef.current.currentY = deltaY;
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current || !sheetRef.current) return;
    if (dragRef.current.currentY > 150) {
      onClose();
    } else {
      sheetRef.current.style.transform = 'translateY(0)';
    }
    dragRef.current = null;
  }, [onClose]);

  // Minimized state
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 cursor-pointer"
        onClick={toggleMinimize}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)',
          }}
        >
          <Sparkles className="h-5 w-5 text-white animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white">AI Assistant</p>
            <p className="text-white/80" style={{ fontSize: '11px' }}>Tap to expand</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="h-7 w-7 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ─── MOBILE BOTTOM SHEET ───
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[9998] animate-in fade-in duration-300"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />

        {/* Bottom Sheet */}
        <div
          ref={sheetRef}
          className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-350"
          style={{
            width: '100vw',
            height: '88vh',
            maxHeight: '88vh',
            background: '#0D1117',
            borderRadius: '24px 24px 0 0',
            boxShadow: '0 -10px 60px rgba(0,0,0,0.8)',
            transition: 'transform 200ms ease',
          }}
        >
          {/* Drag Handle */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ height: '20px' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '100px' }} />
          </div>

          {/* Mobile Header */}
          <div
            className="flex items-center gap-3.5 flex-shrink-0"
            style={{ height: '72px', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Large Avatar */}
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)',
              }}
            >
              <Sparkles className="text-white" style={{ width: '22px', height: '22px' }} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold" style={{ fontSize: '22px', lineHeight: '1.2' }}>AI Assistant</h3>
              <div className="flex items-center gap-1.5" style={{ marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                <span style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#22C55E' }}>
                  ONLINE NOW
                </span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              aria-label="Close chat"
            >
              <X className="text-white" style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ padding: '20px 16px', WebkitOverflowScrolling: 'touch' }}>
            <VoiceStatusIndicator isListening={voiceState.isListening} isSpeaking={voiceState.isSpeaking} />

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-500">
                <div
                  className="flex items-center justify-center mb-5"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(255,107,51,0.15), rgba(236,72,153,0.15), rgba(180,76,255,0.15))',
                    border: '1px solid rgba(255,107,51,0.2)',
                  }}
                >
                  <Sparkles className="text-white animate-pulse" style={{ width: '28px', height: '28px', color: '#EC4899' }} />
                </div>
                <p className="text-white font-semibold mb-1" style={{ fontSize: '18px' }}>Hey there! 👋</p>
                <p className="text-center" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', maxWidth: '260px' }}>
                  I can help you book celebrities, navigate the platform, and more!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <TypingIndicator />
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            )}
          </div>

          {/* Quick Actions (empty state) */}
          {messages.length === 0 && (
            <div
              className="flex-shrink-0 flex gap-2.5 overflow-x-auto no-scrollbar"
              style={{ padding: '0 16px 12px', WebkitOverflowScrolling: 'touch' }}
            >
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  className="flex-shrink-0 flex items-center gap-2 cursor-pointer transition-all duration-150 active:scale-95"
                  onClick={() => sendMessage(action)}
                  style={{
                    background: '#1C2438',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '100px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    whiteSpace: 'nowrap',
                    minHeight: '40px',
                  }}
                >
                  <Sparkles style={{ width: '14px', height: '14px', color: '#EC4899' }} />
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div
            className="flex-shrink-0"
            style={{
              background: '#0D1117',
              padding: '12px 16px',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="flex items-center gap-3"
              style={{
                background: '#1C2438',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '10px 16px',
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none text-white"
                style={{
                  fontSize: '16px',
                  lineHeight: '1.4',
                  WebkitTapHighlightColor: 'transparent',
                }}
                aria-label="Message input"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 flex items-center justify-center active:scale-[0.94] transition-transform"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: input.trim()
                    ? 'linear-gradient(135deg, #FF6B33 0%, #EC4899 100%)'
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  boxShadow: input.trim() ? '0 4px 16px rgba(255,107,51,0.4)' : 'none',
                }}
                aria-label="Send message"
              >
                <ArrowUp style={{ width: '20px', height: '20px', color: input.trim() ? 'white' : 'rgba(255,255,255,0.3)' }} />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── DESKTOP FLOATING CARD ───
  return (
    <div className="fixed z-[9999] flex animate-in slide-in-from-bottom-4 duration-300"
      style={isFullscreen ? { inset: 0 } : {
        bottom: '90px',
        right: '24px',
        width: '360px',
        height: '480px',
      }}
    >
      {/* History Sidebar (Fullscreen only) */}
      {showHistory && isFullscreen && (
        <div className="relative border-r" style={{ width: '320px', borderColor: 'rgba(255,255,255,0.06)', background: '#0F1520' }}>
          <ConversationHistory
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
        </div>
      )}

      {/* Main Card */}
      <div
        className="relative flex flex-col flex-1 overflow-hidden"
        style={{
          background: '#0F1520',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: isFullscreen ? '0' : '20px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
          height: isFullscreen ? '100%' : '480px',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 flex-shrink-0"
          style={{
            height: '52px',
            background: '#141B2D',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 12px',
          }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)',
            }}
          >
            <Sparkles className="text-white" style={{ width: '16px', height: '16px' }} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold" style={{ fontSize: '13px', lineHeight: '1.2' }}>AI Assistant</h3>
            <p style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.4)' }}>
              {voiceState.isListening ? '🎤 LISTENING...' : voiceState.isSpeaking ? '🔊 SPEAKING...' : mode === 'text' ? 'TEXT MODE · FREE' : 'VOICE MODE · $0.30/MIN'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Mode toggle pill */}
            <div className="flex rounded-full p-0.5 mr-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <HeaderIconBtn
                icon={<Keyboard style={{ width: '14px', height: '14px' }} />}
                active={mode === 'text'}
                onClick={() => { setMode('text'); toast.success('Text mode (FREE)'); }}
                title="Text mode (FREE)"
                round
              />
              <HeaderIconBtn
                icon={<Mic style={{ width: '14px', height: '14px' }} />}
                active={mode === 'voice'}
                onClick={() => setMode('voice')}
                title="Voice mode"
                round
              />
            </div>

            {isFullscreen && (
              <HeaderIconBtn
                icon={<HistoryIcon style={{ width: '14px', height: '14px' }} />}
                onClick={toggleHistory}
                title={showHistory ? "Hide history" : "Show history"}
              />
            )}
            <PreferencesDialog />
            <HeaderIconBtn
              icon={<Trash2 style={{ width: '14px', height: '14px' }} />}
              onClick={clearMessages}
              title="Clear chat"
            />
            <HeaderIconBtn
              icon={isFullscreen ? <Minimize2 style={{ width: '14px', height: '14px' }} /> : <Maximize2 style={{ width: '14px', height: '14px' }} />}
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            />
            <HeaderIconBtn
              icon={<Minimize2 style={{ width: '14px', height: '14px' }} />}
              onClick={toggleMinimize}
              title="Minimize"
            />
            <HeaderIconBtn
              icon={<X style={{ width: '14px', height: '14px' }} />}
              onClick={onClose}
              title="Close"
              isClose
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
              <VoiceStatusIndicator isListening={voiceState.isListening} isSpeaking={voiceState.isSpeaking} />

              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 animate-in fade-in duration-500">
                  <div
                    className="flex items-center justify-center mb-4"
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, rgba(255,107,51,0.15), rgba(236,72,153,0.15), rgba(180,76,255,0.15))',
                      border: '1px solid rgba(255,107,51,0.2)',
                    }}
                  >
                    <Sparkles className="animate-pulse" style={{ width: '28px', height: '28px', color: '#EC4899' }} />
                  </div>
                  <p className="text-white font-semibold text-sm mb-1">Hey there! 👋</p>
                  <p className="text-center" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', maxWidth: '220px' }}>
                    I can help you book celebrities, navigate the platform, and more!
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isLoading && (
                    <div className="flex gap-2 items-start">
                      <div
                        className="flex-shrink-0 flex items-center justify-center"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)',
                        }}
                      >
                        <Sparkles className="text-white animate-pulse" style={{ width: '12px', height: '12px' }} />
                      </div>
                      <TypingIndicator />
                    </div>
                  )}
                  <div ref={scrollRef} />
                </>
              )}
            </div>
          </ScrollArea>

          {/* Quick Actions (empty state) */}
          {messages.length === 0 && (
            <div className="flex-shrink-0" style={{ padding: '8px 12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', padding: '0 4px 6px' }}>
                Quick start
              </p>
              <div className="grid grid-cols-2 gap-1.5 pb-2">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-1.5 text-left leading-tight cursor-pointer transition-all duration-200"
                    onClick={() => sendMessage(action)}
                    style={{
                      background: '#1C2640',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '12px',
                      padding: '8px 10px',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.7)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,107,51,0.3)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.background = 'rgba(255,107,51,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                      e.currentTarget.style.background = '#1C2640';
                    }}
                  >
                    <Sparkles className="flex-shrink-0" style={{ width: '12px', height: '12px', color: '#EC4899' }} />
                    <span className="line-clamp-2">{action}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div
          className="flex-shrink-0"
          style={{
            background: '#141B2D',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '10px 12px',
            borderRadius: isFullscreen ? '0' : '0 0 20px 20px',
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '6px 10px',
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-white"
              style={{ fontSize: '13px', lineHeight: '1.4' }}
              aria-label="Message input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 flex items-center justify-center transition-all duration-200 hover:brightness-110 hover:scale-105"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: input.trim()
                  ? 'linear-gradient(135deg, #FF6B33 0%, #EC4899 100%)'
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
              }}
              aria-label="Send message"
            >
              <ArrowUp style={{ width: '16px', height: '16px', color: input.trim() ? 'white' : 'rgba(255,255,255,0.3)' }} />
            </button>
          </div>
          <p className="hidden md:block text-center" style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
            ENTER TO SEND · ESC TO CLOSE
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Header Icon Button ───
function HeaderIconBtn({
  icon, onClick, title, active, round, isClose,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  round?: boolean;
  isClose?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center transition-colors cursor-pointer"
      style={{
        width: round ? '28px' : '28px',
        height: round ? '28px' : '28px',
        borderRadius: round ? '50%' : '6px',
        background: active ? 'rgba(255,255,255,0.25)' : 'transparent',
        border: 'none',
        color: active ? 'white' : 'rgba(255,255,255,0.45)',
      }}
      onMouseEnter={(e) => {
        if (isClose) {
          e.currentTarget.style.color = '#EF4444';
          e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
        } else {
          e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? 'white' : 'rgba(255,255,255,0.45)';
        e.currentTarget.style.background = active ? 'rgba(255,255,255,0.25)' : 'transparent';
      }}
    >
      {icon}
    </button>
  );
}
