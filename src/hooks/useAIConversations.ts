import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AIConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export const useAIConversations = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select(`
          id,
          title,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      console.warn('Failed to load conversation history:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Create new conversation
  const createConversation = useCallback(async (title?: string) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: title || 'New Conversation',
        })
        .select()
        .single();

      if (error) throw error;
      
      await loadConversations();
      setCurrentConversationId(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  }, [user?.id, loadConversations]);

  // Save message to conversation
  const saveMessage = useCallback(async (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    isVoiceInput = false,
    actions?: any,
    suggestions?: any
  ) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
          is_voice_input: isVoiceInput,
          actions,
          suggestions,
        });

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Generate title from first user message if not set
      if (role === 'user') {
        const { data: conv } = await supabase
          .from('ai_conversations')
          .select('title')
          .eq('id', conversationId)
          .single();

        if (conv?.title === 'New Conversation') {
          const generatedTitle = content.substring(0, 50) + (content.length > 50 ? '...' : '');
          await supabase
            .from('ai_conversations')
            .update({ title: generatedTitle })
            .eq('id', conversationId);
        }
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }, [user?.id]);

  // Load messages from conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load conversation');
      return [];
    }
  }, [user?.id]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      
      await loadConversations();
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  }, [user?.id, currentConversationId, loadConversations]);

  // Export conversation
  const exportConversation = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const messages = await loadMessages(conversationId);
      const { data: conv } = await supabase
        .from('ai_conversations')
        .select('title, created_at')
        .eq('id', conversationId)
        .single();

      const exportData = {
        title: conv?.title || 'Conversation',
        created_at: conv?.created_at,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
          is_voice_input: m.is_voice_input,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${conv?.title?.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Log analytics
      await supabase.from('ai_usage_analytics').insert({
        user_id: user.id,
        conversation_id: conversationId,
        action_type: 'conversation_exported',
        metadata: { title: conv?.title },
      });

      toast.success('Conversation exported successfully');
    } catch (error) {
      console.error('Error exporting conversation:', error);
      toast.error('Failed to export conversation');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadMessages]);

  return {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    isLoading,
    createConversation,
    saveMessage,
    loadMessages,
    deleteConversation,
    exportConversation,
    refreshConversations: loadConversations,
  };
};
