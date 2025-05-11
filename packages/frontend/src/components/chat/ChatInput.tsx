import React, { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { MessageLoading } from '@/components/ui/message-loading';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  isSubmitDisabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  isSubmitDisabled,
  placeholder = '메시지를 입력하세요...'
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (message.trim() && !isSubmitDisabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <div className="border border-gray-700 bg-gray-800 rounded-lg overflow-hidden">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="w-full py-3 px-4 bg-gray-800 text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500"
          style={{
            minHeight: '60px',
            maxHeight: '200px',
          }}
        />
        
        <div className="p-2 flex justify-between items-center border-t border-gray-700 bg-gray-850">
          <div className="text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 font-mono text-xs">Shift + Enter</kbd> 줄바꿈
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || disabled || isSubmitDisabled}
            className="rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 flex items-center"
          >
            <Send className="h-4 w-4" />
            <span className="ml-1">전송</span>
          </button>
        </div>
      </div>
      
      {disabled && (
        <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center rounded-lg">
          <MessageLoading />
        </div>
      )}
    </div>
  );
};

export default ChatInput; 