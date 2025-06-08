'use client';

import { MessageSquare, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { FileAttachment } from '@/types/file-attachment';

interface ChatSectionProps {
  activeConversation: string | null;
  conversations: Array<{
    id: string;
    title: string;
    lastMessage: string;
    starred: boolean;
    time: string;
  }>;
  selectedModel: string;
  chatSessionId: string;
  savedInitialMessage: string;
  savedAttachments: FileAttachment[];
  onClose: () => void;
  onModelSelect: () => void;
}

export const ChatSection = ({
  activeConversation,
  conversations,
  selectedModel,
  chatSessionId,
  savedInitialMessage,
  savedAttachments,
  onClose,
  onModelSelect
}: ChatSectionProps) => {
  return (
    <div className="h-full flex flex-col glass rounded-lg shadow-xl overflow-hidden">
      <div className="bg-gray-900/80 p-3 flex justify-between items-center border-b border-gray-900">
        <div className="flex items-center gap-3">
          <h2 className="text-md font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            {activeConversation 
              ? conversations.find(c => c.id === activeConversation)?.title
              : '새 대화'}
          </h2>
          {selectedModel && (
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-900/50 text-xs text-indigo-200 cursor-pointer hover:bg-indigo-900/80 transition-colors"
              onClick={onModelSelect}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
              <span>{selectedModel}</span>
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="hover:bg-gray-800"
        >
          <span className="sr-only">닫기</span>
          <PlusIcon className="rotate-45 h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ChatInterface 
          key={chatSessionId}
          modelId={selectedModel}
          initialMessage={savedInitialMessage}
          initialAttachments={savedAttachments.length > 0 ? savedAttachments : undefined}
        />
      </div>
    </div>
  );
};