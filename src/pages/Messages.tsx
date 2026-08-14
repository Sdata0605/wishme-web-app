import { useState, useEffect, useCallback } from "react";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatView } from "@/components/messages/ChatView";
import { MessageCircle, Search, Edit2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

export default function Messages() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { conversations, loading, markAsRead } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    markAsRead(id);
    if (isMobile) setShowChat(true);
  }, [isMobile, markAsRead]);

  const handleBack = useCallback(() => {
    setShowChat(false);
    setSelectedConversationId(null);
  }, []);

  const filteredConversations = conversations.filter(conv =>
    (conv.celebrity?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Story circles for mobile (derived from conversations)
  const storyCircles = conversations.slice(0, 6).map(conv => ({
    id: conv.id,
    name: conv.celebrity?.name?.split(' ')[0] || 'User',
    image: conv.celebrity?.image_url,
  }));

  return (
    <AuthenticatedLayout showSidebar={!!user}>
      {/* 
        This container sits inside AuthenticatedLayout.
        Mobile: Layout adds pt-[60px] and mobile-safe-bottom (pb-20).
        We use calc to fill the remaining viewport exactly.
      */}
      <div
        className="flex w-full overflow-hidden"
        style={{
          background: 'hsl(var(--message-shell))',
          height: isMobile ? 'calc(100dvh - 60px - 72px)' : 'calc(100vh - 60px)',
        }}
      >
        {/* ─── LEFT PANEL: Conversation List ─── */}
        <div
          className={`flex flex-col h-full ${
            isMobile
              ? showChat ? 'hidden' : 'w-full'
              : 'w-[320px] shrink-0'
          }`}
          style={{
            background: 'hsl(var(--message-sidebar))',
            borderRight: isMobile ? 'none' : '1px solid hsl(var(--border) / 0.5)',
          }}
        >
          {/* Panel Header */}
          <div
            className="shrink-0 flex items-center justify-between px-5"
            style={{ height: 56, borderBottom: '1px solid hsl(var(--border) / 0.5)' }}
          >
            <h1
              className="text-xl font-bold italic"
              style={{
                background: 'var(--gradient-message-heading)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Messages
            </h1>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'hsl(var(--foreground) / 0.08)' }}
            >
              <Edit2 className="w-4 h-4 text-foreground/70" />
            </button>
          </div>

          {/* Mobile Story Circles */}
          {isMobile && storyCircles.length > 0 && (
            <div className="shrink-0 px-4 pt-3 pb-1">
              <div className="flex gap-4 overflow-x-auto no-scrollbar">
                {/* YOU circle */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center"
                    style={{
                      background: 'hsl(var(--message-sidebar))',
                      border: '2px solid transparent',
                      backgroundImage: 'linear-gradient(hsl(var(--message-sidebar)), hsl(var(--message-sidebar))), var(--gradient-message-sent)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="You" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-semibold">YOU</span>
                    )}
                  </div>
                  <span className="text-[10px] text-white/50">YOU</span>
                </div>
                {storyCircles.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
                    onClick={() => handleSelectConversation(s.id)}
                  >
                    <div className="relative">
                      <div className="w-[52px] h-[52px] rounded-full overflow-hidden border-2 border-white/10">
                        {s.image ? (
                          <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center text-white text-sm font-semibold">
                            {s.name[0]}
                          </div>
                        )}
                      </div>
                      <div
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
                        style={{ background: 'hsl(var(--message-success))', border: '2px solid hsl(var(--message-sidebar))' }}
                      />
                    </div>
                    <span className="text-[10px] text-white/60 truncate max-w-[52px] text-center">
                      {s.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="px-4 py-2.5">
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
              style={{
                  background: 'hsl(var(--foreground) / 0.04)',
                  border: '1px solid hsl(var(--border) / 0.5)',
              }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--foreground) / 0.3)' }} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-foreground placeholder:text-foreground/30 w-full"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {loading ? (
              <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, #FF6B33, #EC4899)' }}
                >
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <p className="text-white font-semibold mb-1">No messages yet</p>
                <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Start a conversation by booking a celebrity
                </p>
                <button
                  onClick={() => navigate('/celebrities')}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #FF6B33, #EC4899)' }}
                >
                  Browse Celebrities
                </button>
              </div>
            ) : (
              <ConversationList
                conversations={filteredConversations}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
              />
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL: Active Chat ─── */}
        <div
          className={`flex-1 flex flex-col h-full min-w-0 ${
            isMobile
              ? showChat ? 'w-full' : 'hidden'
              : ''
          }`}
        >
          {selectedConversation ? (
            <ChatView
              conversation={selectedConversation}
              onBack={isMobile ? handleBack : undefined}
            />
          ) : (
            !isMobile && (
                <div className="flex-1 flex flex-col items-center justify-center" style={{ background: 'hsl(var(--message-shell))' }}>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                    style={{ background: 'var(--gradient-message-sent)' }}
                >
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <p className="text-base" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Select a conversation to start chatting
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
