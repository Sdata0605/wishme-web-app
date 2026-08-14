import React from 'react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { ChatBubble } from './ChatBubble';
import { ChatInterface } from './ChatInterface';

export const AIAssistant = () => {
  const { isOpen, setIsOpen } = useAIAssistant();

  return (
    <>
      <ChatBubble onClick={() => setIsOpen(!isOpen)} />
      {isOpen && <ChatInterface onClose={() => setIsOpen(false)} />}
    </>
  );
};
