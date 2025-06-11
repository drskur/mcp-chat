'use client';

import { Brain, Server, Sparkles, Paperclip } from 'lucide-react';
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input';
import { FileAttachment } from '@/types/file-attachment';
import React from 'react';
import Image from 'next/image';
import { FileAttachmentPreview } from '@/components/features/file/FileAttachmentPreview';

interface UserSettings {
  title: string;
  subtitle: string;
  logoUrl: string;
  logoOpacity: number;
}

interface WelcomeScreenProps {
  userSettings: UserSettings;
  attachments: FileAttachment[];
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onAttachButtonClick: () => void;
  onRemoveAttachment: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const placeholders = [
  "What's the latest news about AWS?",
  'Can you search for news about AI developments?',
  'Generate an image of a cloud architecture diagram',
  'Create an illustration of a modern web application',
  'Can you make an image of a futuristic data center?',
  'Search for recent articles about cloud computing trends',
];

export const WelcomeScreen = ({
  userSettings,
  attachments,
  inputValue,
  onInputChange,
  onInputSubmit,
  onAttachButtonClick,
  onRemoveAttachment,
  fileInputRef,
  onFileUpload,
}: WelcomeScreenProps) => {
  return (
    <div className="h-full flex flex-col items-center justify-center max-w-full">
      <div className="max-w-4xl w-full glass p-8 md:p-12 rounded-xl mb-8 fade-in overflow-hidden">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-indigo-600 rounded-xl blur-lg opacity-50"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center">
              {userSettings.logoUrl ? (
                <Image
                  src={userSettings.logoUrl}
                  alt="로고"
                  className="w-full h-full object-contain"
                  style={{ opacity: userSettings.logoOpacity }}
                />
              ) : (
                <Brain className="h-10 w-10 text-white" />
              )}
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400">
            {userSettings.title}
          </h1>

          <div className="flex gap-2 items-center justify-center mb-5">
            <div className="flex items-center gap-1.5 bg-indigo-950/60 px-3 py-1.5 rounded-full text-xs text-indigo-300">
              <Server className="h-3 w-3" />
              <span>AWS Bedrock</span>
            </div>
            <div className="flex items-center gap-1.5 bg-purple-950/60 px-3 py-1.5 rounded-full text-xs text-purple-300">
              <Brain className="h-3 w-3" />
              <span>Anthropic Claude</span>
            </div>
            <div className="flex items-center gap-1.5 bg-purple-950/60 px-3 py-1.5 rounded-full text-xs text-purple-300">
              <Brain className="h-3 w-3" />
              <span>Amazon Nova</span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-950/60 px-3 py-1.5 rounded-full text-xs text-blue-300">
              <Sparkles className="h-3 w-3" />
              <span>LangGraph</span>
            </div>
          </div>

          <FileAttachmentPreview
            attachments={attachments}
            onRemove={onRemoveAttachment}
          />

          <div data-component="welcome-screen-input" className="w-full max-w-4xl">
            <PlaceholdersAndVanishInput
              placeholders={placeholders}
              onChange={onInputChange}
              onSubmit={onInputSubmit}
              value={inputValue}
              className="mb-8 max-w-full"
              rightElement={
              <button
                type="button"
                onClick={onAttachButtonClick}
                className="p-2 text-gray-400 hover:text-indigo-400 transition-colors"
                title="파일 첨부"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            }
          />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv"
          />

          <p className="text-gray-400 mb-8 max-w-2xl">
            Elevate your coding, problem-solving, and analysis with our advanced
            AI assistant. MCP Agent delivers powerful productivity enhancements
            through a diverse suite of tools.
          </p>
        </div>
      </div>
    </div>
  );
};
