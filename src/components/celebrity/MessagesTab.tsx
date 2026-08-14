import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageSquare, Bot, Send, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTypingPresence } from "@/hooks/useTypingPresence";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, isToday, isYesterday } from "date-fns";

// Renders message text with inline images/videos for media URLs
function MessageContent({ text }: { text: string }) {
  const mediaUrlPattern = /(https?:\/\/[^\s\[\]()]+\.(?:png|jpg|jpeg|gif|webp|avif|mp4|mov|webm))/gi;
  const parts = text.split(mediaUrlPattern);

  if (parts.length === 1) {
    return <p className="text-sm whitespace-pre-wrap break-words">{text}</p>;
  }

  return (
    <div className="text-sm space-y-2">
      {parts.map((part, i) => {
        if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|avif|mp4|mov|webm)$/i.test(part)) {
          const isVideo = /\.(mp4|mov|webm)$/i.test(part);
          if (isVideo) {
            return <video key={i} src={part} controls className="rounded-md max-w-full max-h-60" />;
          }
          return (
            <img key={i} src={part} alt="Shared media" className="rounded-md max-w-full max-h-60 cursor-pointer" loading="lazy" onClick={() => window.open(part, '_blank')} />
          );
        }
        const cleaned = part.replace(/\[[^\]]*?:\s*$/, '').replace(/^\]\s*/, '').trim();
        if (!cleaned) return null;
        return <p key={i} className="whitespace-pre-wrap">{cleaned}</p>;
      })}
    </div>
  );
}

interface Message {
  id: string;
  message_text: string;
  sender_type: string;
  is_ai_generated: boolean;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  user_id: string;
  last_message_at: string;
  unread_count_celebrity: number;
  user_first_name?: string;
  user_last_name?: string;
}

function DateSeparator({ date }: { date: Date }) {
  let label = format(date, 'MMM d');
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <span className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

export function MessagesTab({ celebrityId }: { celebrityId: string }) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [aiEnabled, setAiEnabled] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingFallbackRef = useRef<number | null>(null);

  const { otherIsTyping: presenceTyping, broadcastTyping, stopTyping: stopPresenceTyping } = useTypingPresence({
    conversationId: selectedConversation,
    participantId: profile?.id,
    participantType: 'celebrity',
  });

  // Combine AI-reply typing indicator with real-time presence typing
  const showTyping = isTyping || presenceTyping;

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchConversations();
  }, [celebrityId]);

  // Realtime for conversations list
  useEffect(() => {
    const channel = supabase
      .channel(`celeb-conversations-${celebrityId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `celebrity_id=eq.${celebrityId}`
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [celebrityId]);

  // Realtime for messages in selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    fetchMessages(selectedConversation);

    const channel = supabase
      .channel(`celeb-messages-${selectedConversation}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConversation}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Clear typing indicator when celebrity/AI reply arrives
        if (newMsg.sender_type === 'celebrity') {
          if (typingFallbackRef.current) {
            clearTimeout(typingFallbackRef.current);
            typingFallbackRef.current = null;
          }
          setIsTyping(false);
        }
        // Show typing indicator when user message arrives (AI will auto-reply)
        if (newMsg.sender_type === 'user') {
          setIsTyping(true);
          typingFallbackRef.current = window.setTimeout(() => {
            setIsTyping(false);
            typingFallbackRef.current = null;
          }, 30000);
        }

        setTimeout(() => scrollToBottom(true), 50);
        
        // Mark as read if from user
        if (newMsg.sender_type === 'user') {
          supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then(() => {});
          supabase.from('conversations').update({ unread_count_celebrity: 0 }).eq('id', selectedConversation).then(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('celebrity_settings')
        .select('ai_auto_reply_enabled, auto_reply_enabled')
        .eq('celebrity_id', celebrityId)
        .maybeSingle();
      setAiEnabled(data?.ai_auto_reply_enabled ?? data?.auto_reply_enabled ?? false);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('celebrity_id', celebrityId)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      if (!convData || convData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(convData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profileMap = new Map((profilesData || []).map(p => [p.id, p]));

      const enriched: Conversation[] = convData.map(conv => {
        const prof = profileMap.get(conv.user_id);
        return {
          id: conv.id,
          user_id: conv.user_id,
          last_message_at: conv.last_message_at,
          unread_count_celebrity: conv.unread_count_celebrity,
          user_first_name: prof?.first_name || '',
          user_last_name: prof?.last_name || '',
        };
      });

      setConversations(enriched);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setTimeout(() => scrollToBottom(), 100);

      // Mark messages as read
      await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).eq('sender_type', 'user');
      await supabase.from('conversations').update({ unread_count_celebrity: 0 }).eq('id', conversationId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !profile?.id) return;

    const text = newMessage.trim();
    setSending(true);
    setNewMessage("");
    stopPresenceTyping();

    // Optimistic update
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      message_text: text,
      sender_type: 'celebrity',
      is_ai_generated: false,
      created_at: new Date().toISOString(),
      is_read: true,
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: profile.id,
          sender_type: 'celebrity',
          message_text: text,
          is_ai_generated: false
        })
        .select()
        .single();

      if (error) {
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        throw error;
      }

      // Replace temp with real
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? data as Message : m));

      // Update conversation
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selectedConversation);
      fetchConversations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleAiReply = async () => {
    if (!selectedConversation) return;

    setSending(true);
    setIsTyping(true);
    typingFallbackRef.current = window.setTimeout(() => {
      setIsTyping(false);
      typingFallbackRef.current = null;
    }, 30000);

    try {
      const { data, error } = await supabase.functions.invoke('celebrity-ai-message', {
        body: {
          conversationId: selectedConversation,
          userMessage: messages[messages.length - 1]?.message_text || ''
        }
      });

      if (error) throw error;

      toast({ title: "AI Reply Sent", description: "AI has generated and sent a response" });
    } catch (error: any) {
      setIsTyping(false);
      if (typingFallbackRef.current) {
        clearTimeout(typingFallbackRef.current);
        typingFallbackRef.current = null;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const toggleAiMode = async (enabled: boolean) => {
    setAiEnabled(enabled);
    try {
      const { error } = await supabase
        .from('celebrity_settings')
        .upsert({ celebrity_id: celebrityId, ai_auto_reply_enabled: enabled, auto_reply_enabled: enabled }, { onConflict: 'celebrity_id' });

      if (error) throw error;

      toast({
        title: enabled ? "AI Auto-Reply Enabled" : "AI Auto-Reply Disabled",
        description: enabled ? "AI will auto-respond to new messages" : "You'll manually respond to messages"
      });
    } catch (error: any) {
      setAiEnabled(!enabled);
      toast({ title: "Error", description: "Failed to update setting", variant: "destructive" });
    }
  };

  const handleTextareaInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    if (isMobile) setShowChat(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateKey) { last.msgs.push(msg); }
    else { groupedMessages.push({ date: dateKey, msgs: [msg] }); }
  });

  const showConvList = isMobile ? !showChat : true;
  const showChatPanel = isMobile ? showChat : true;

  return (
    <div className="space-y-4">
      {/* AI Toggle */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: aiEnabled ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)' }}>
            <Bot className="w-5 h-5" style={{ color: aiEnabled ? '#22C55E' : 'rgba(255,255,255,0.4)' }} />
          </div>
          <div>
            <Label htmlFor="ai-mode" className="text-white font-semibold text-sm cursor-pointer">AI Auto-Reply</Label>
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>AI responds to fans automatically when you're away</p>
          </div>
        </div>
        <Switch id="ai-mode" checked={aiEnabled} onCheckedChange={toggleAiMode} />
      </div>

      {aiEnabled && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
          <Bot className="w-4 h-4" style={{ color: '#22C55E' }} />
          <span className="text-xs" style={{ color: 'rgba(34,197,94,0.8)' }}>🤖 AI Auto-Reply is ON — AI will respond to new fan messages</span>
        </div>
      )}

      {/* Messages Panel */}
      <div
        className="rounded-xl overflow-hidden flex"
        style={{
          background: 'hsl(var(--message-sidebar))',
          border: '1px solid hsl(var(--border) / 0.5)',
          height: isMobile ? 'min(72dvh, 720px)' : 600,
          minHeight: 400,
        }}
      >
        {/* Conversations List */}
        {showConvList && (
          <div
            className={`flex flex-col min-h-0 ${isMobile ? 'w-full' : 'w-[280px] shrink-0'}`}
            style={{ borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="shrink-0 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="font-semibold text-white text-sm">Conversations</h3>
            </div>
            {conversations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No conversations yet</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => {
                  const displayName = [conv.user_first_name, conv.user_last_name].filter(Boolean).join(' ') || 'User';
                  const isSelected = selectedConversation === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className="w-full p-4 text-left transition-colors flex items-center gap-3"
                      style={{
                        background: isSelected ? 'rgba(255,107,51,0.08)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-sm" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        {displayName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-white truncate">{displayName}</p>
                          {conv.unread_count_celebrity > 0 && (
                            <span className="shrink-0 ml-2 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ background: '#FF6B33', minWidth: 18, height: 18, padding: '0 5px' }}>
                              {conv.unread_count_celebrity}
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {new Date(conv.last_message_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Messages Area */}
        {showChatPanel && (
          <div className={`flex flex-col min-h-0 ${isMobile ? 'w-full' : 'flex-1'}`}>
            {selectedConversation ? (
              <>
                {/* Chat header */}
                {isMobile && (
                  <div className="shrink-0 flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => { setShowChat(false); setSelectedConversation(null); }} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <ArrowLeft className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-sm font-semibold text-white">
                      {conversations.find(c => c.id === selectedConversation)?.user_first_name || 'User'}
                    </span>
                  </div>
                )}

                {/* Messages */}
                 <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 40 }}>
                  {groupedMessages.map((group) => (
                    <div key={group.date}>
                      <DateSeparator date={new Date(group.date)} />
                      {group.msgs.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender_type === 'celebrity' ? 'justify-end' : 'justify-start'} mb-2`}>
                          <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${msg.sender_type === 'celebrity' ? '' : ''}`}
                            style={{
                              background: msg.sender_type === 'celebrity'
                                ? 'linear-gradient(135deg, #FF6B33 0%, #EC4899 100%)'
                                : '#1C2438',
                              border: msg.sender_type === 'celebrity' ? 'none' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: msg.sender_type === 'celebrity' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            }}
                          >
                            {msg.is_ai_generated && (
                              <div className="flex items-center gap-1 text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                <Bot className="w-3 h-3" />
                                <span>AI Generated</span>
                              </div>
                            )}
                            <MessageContent text={msg.message_text} />
                            <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {/* Typing indicator */}
                  {showTyping && (
                    <div className="flex justify-start mb-2 animate-in slide-in-from-left-2">
                      <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: '#1C2438', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px 18px 18px 4px' }}>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
                        </div>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{presenceTyping ? 'User is typing...' : 'AI is typing...'}</span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                 <div className="shrink-0 p-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}>
                  {aiEnabled && messages.length > 0 && messages[messages.length - 1].sender_type === 'user' && (
                    <button
                      onClick={handleAiReply}
                      disabled={sending}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: '#22C55E' }}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      Generate AI Reply
                    </button>
                  )}
                  <div className="flex gap-2 items-end">
                    <div
                      className="flex-1 flex items-end gap-2 rounded-2xl px-3.5 py-2.5"
                      style={{ background: '#1C2438', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => { setNewMessage(e.target.value); handleTextareaInput(); if (e.target.value.trim()) broadcastTyping(); else stopPresenceTyping(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Type your message..."
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none text-white resize-none leading-relaxed placeholder:text-white/30"
                        style={{ fontSize: 16, minHeight: 24, maxHeight: 120 }}
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-opacity disabled:opacity-30"
                      style={{ background: newMessage.trim() ? 'linear-gradient(135deg, #FF6B33, #EC4899)' : 'rgba(255,255,255,0.08)' }}
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
