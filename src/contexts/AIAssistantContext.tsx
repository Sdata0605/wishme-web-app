import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth, AuthContext } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAIConversations } from '@/hooks/useAIConversations';
import { useAIAnalytics } from '@/hooks/useAIAnalytics';
import { useAIPreferences } from '@/hooks/useAIPreferences';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  suggestions?: string[];
  isVoiceInput?: boolean;
}

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
}

export interface AIAction {
  type: 'navigate' | 'fillForm' | 'search' | 'showInfo';
  label: string;
  data: any;
}

interface AIAssistantContextType {
  messages: AIMessage[];
  isOpen: boolean;
  isLoading: boolean;
  isTyping: boolean;
  voiceState: VoiceState;
  currentConversationId: string | null;
  mode: 'text' | 'voice';
  setIsOpen: (open: boolean) => void;
  setMode: (mode: 'text' | 'voice') => void;
  sendMessage: (content: string, isVoice?: boolean) => Promise<void>;
  clearMessages: () => void;
  executeAction: (action: AIAction) => void;
  getLastResponse: () => string | null;
  setVoiceState: (state: Partial<VoiceState>) => void;
  loadConversation: (conversationId: string) => Promise<void>;
  startNewConversation: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const AIAssistantProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('text'); // Default to text mode
  const [voiceState, setVoiceStateInternal] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
  });
  const location = useLocation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const profile = authContext?.profile ?? null;
  const { 
    currentConversationId, 
    setCurrentConversationId,
    createConversation,
    saveMessage,
    loadMessages,
  } = useAIConversations();
  const { trackAction } = useAIAnalytics();
  const { preferences } = useAIPreferences();

  const setVoiceState = useCallback((state: Partial<VoiceState>) => {
    setVoiceStateInternal(prev => ({ ...prev, ...state }));
  }, []);

  // Load conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const loadedMessages = await loadMessages(conversationId);
      const formattedMessages: AIMessage[] = loadedMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        isVoiceInput: msg.is_voice_input,
        actions: (Array.isArray(msg.actions) ? msg.actions as unknown as AIAction[] : undefined),
        suggestions: (Array.isArray(msg.suggestions) ? msg.suggestions as unknown as string[] : undefined),
      }));
      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, [loadMessages, setCurrentConversationId]);

  // Start new conversation
  const startNewConversation = useCallback(async () => {
    const newId = await createConversation();
    if (newId) {
      setMessages([]);
      setCurrentConversationId(newId);
    }
  }, [createConversation, setCurrentConversationId]);

  const sendMessage = useCallback(async (content: string, isVoice = false) => {
    if (!content.trim()) return;

    // Auto-open chat if voice and preference enabled
    if (isVoice && preferences.auto_open_on_voice) {
      setIsOpen(true);
    }

    // Ensure we have a conversation
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createConversation();
      if (!conversationId) return;
    }

    // Add user message
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      isVoiceInput: isVoice,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);

    // Track analytics
    await trackAction(isVoice ? 'voice_used' : 'message_sent', conversationId, {
      message_length: content.length,
      current_route: location.pathname,
    });

    // Save user message to database
    await saveMessage(conversationId, 'user', content, isVoice);

    try {
      // Use Lovable AI (google/gemini-2.5-flash) for text mode - FREE during promo!
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          query: content,
          conversationHistory: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
          })),
          context: {
            currentRoute: location.pathname,
            userRole: profile?.role || 'user',
            userId: user?.id,
            isVoiceInput: isVoice,
          },
          model: 'google/gemini-2.5-flash', // Use free Gemini model
        },
      });

      if (error) throw error;

      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        actions: data.actions || [],
        suggestions: data.suggestions || [],
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await saveMessage(
        conversationId,
        'assistant',
        data.message,
        false,
        data.actions,
        data.suggestions
      );
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      
      let errorText = 'Sorry, I encountered an error. Please try again.';
      if (error?.message?.includes('Rate limit')) {
        errorText = '⏱️ Too many requests. Please wait a moment and try again.';
        toast.error('Rate limit exceeded. Please try again in a moment.');
      } else if (error?.message?.includes('payment') || error?.message?.includes('402')) {
        errorText = '💳 AI service requires payment. Please contact support.';
        toast.error('AI service payment required. Please contact support.');
      } else {
        toast.error('Failed to get response from AI assistant');
      }
      
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [location.pathname, profile?.role, user?.id, messages, currentConversationId, createConversation, saveMessage, trackAction, preferences.auto_open_on_voice]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const executeAction = useCallback((action: AIAction) => {
    // This will be implemented by consumers through useAINavigation and useAIFormAssist
    console.log('Execute action:', action);
  }, []);

  const getLastResponse = useCallback(() => {
    const lastMessage = messages.filter(m => m.role === 'assistant').pop();
    return lastMessage?.content || null;
  }, [messages]);

  return (
    <AIAssistantContext.Provider
      value={{
        messages,
        isOpen,
        isLoading,
        isTyping,
        voiceState,
        currentConversationId,
        mode,
        setIsOpen,
        setMode,
        sendMessage,
        clearMessages,
        executeAction,
        getLastResponse,
        setVoiceState,
        loadConversation,
        startNewConversation,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
};

export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within AIAssistantProvider');
  }
  return context;
};
