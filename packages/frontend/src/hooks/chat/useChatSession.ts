import { useState } from 'react';

interface ChatSession {
  id: string;
  createdAt: number;
  isActive: boolean;
}

export function useChatSession() {
  const [currentSession, setCurrentSession] = useState<ChatSession>(() => ({
    id: Date.now().toString(),
    createdAt: Date.now(),
    isActive: false,
  }));

  const [showChat, setShowChat] = useState(false);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      isActive: true,
    };

    setCurrentSession(newSession);
    
    // Clear any stored chat data
    localStorage.removeItem('mcp_initial_message');
    localStorage.removeItem('mcp_initial_attachments');
    localStorage.setItem('mcp_reset_conversation', 'true');

    // Notify other components of session reset
    window.dispatchEvent(new Event('mcp_reset_conversation'));
    
    return newSession;
  };

  const activateSession = (sessionId?: string) => {
    if (sessionId && sessionId !== currentSession.id) {
      setCurrentSession(prev => ({
        ...prev,
        id: sessionId,
        isActive: true,
      }));
    } else {
      setCurrentSession(prev => ({
        ...prev,
        isActive: true,
      }));
    }
    
    setShowChat(true);
  };

  const deactivateSession = () => {
    setCurrentSession(prev => ({
      ...prev,
      isActive: false,
    }));
    
    setShowChat(false);
  };

  const resetSession = () => {
    const newSession = createNewSession();
    setShowChat(true);
    return newSession;
  };

  return {
    currentSession,
    showChat,
    setShowChat,
    createNewSession,
    activateSession,
    deactivateSession,
    resetSession,
  };
}