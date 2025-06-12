import React from 'react';
import { Paperclip } from 'lucide-react';
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input';
import { Button } from '@/components/ui/button';
import { getFileAcceptStringByCapabilities } from '@/lib/utils/fileUtils';

interface ChatInputProps {
  input: string;
  isStreaming: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onAttachButtonClick: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  isStreaming,
  fileInputRef,
  onInputChange,
  onSubmit,
  onAttachButtonClick,
  onFileUpload,
}) => {
  return (
    <div className="relative" data-component="chat-interface-input">
      <PlaceholdersAndVanishInput
        placeholders={[]}
        value={input}
        onChange={onInputChange}
        onSubmit={onSubmit}
        submitDisabled={isStreaming}
        rightElement={
          <Button
            type="button"
            variant="ghost"
            onClick={onAttachButtonClick}
            disabled={isStreaming}
            className="px-3 py-3 text-gray-400 hover:text-indigo-400 transition-colors"
            title="파일 첨부"
          >
            <Paperclip className="h-6 w-6" />
          </Button>
        }
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileUpload}
        className="hidden"
        multiple
        accept={getFileAcceptStringByCapabilities(['image', 'text'])}
      />
    </div>
  );
};
