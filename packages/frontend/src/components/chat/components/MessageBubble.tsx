import React from 'react';
import Image from 'next/image';
import { FileIcon, ExternalLink } from "lucide-react";
import { ChatBubble, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { MessageLoading } from "@/components/ui/message-loading";
import { ContentRenderer } from './ContentRenderer';
import type { Message, ImageContentItem, DocumentContentItem, ZoomedImageState } from '../types/chat.types';

interface MessageBubbleProps {
  message: Message;
  fadeDuration: number;
  onToggleToolCollapse: (messageId: string, itemId: string) => void;
  onSetZoomedImage: (state: ZoomedImageState) => void;
  onOpenFileInNewTab: (fileId: string, fileName: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  fadeDuration,
  onToggleToolCollapse,
  onSetZoomedImage,
  onOpenFileInNewTab
}) => {

  // 파일 아이콘 선택 함수
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'pdf';
    if (fileType.includes('word') || fileType.includes('doc')) return 'doc';
    if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('xls') || fileType.includes('csv')) return 'sheet';
    if (fileType.includes('text') || fileType.includes('markdown') || fileType.includes('txt') || fileType.includes('md')) return 'text';
    if (fileType.includes('image') || fileType.includes('png') || fileType.includes('jpg') || fileType.includes('jpeg') || fileType.includes('gif')) return 'image';
    if (fileType.includes('html') || fileType.includes('htm')) return 'html';
    if (fileType.includes('json') || fileType.includes('xml')) return 'code';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar') || fileType.includes('gz')) return 'archive';
    if (fileType.includes('ppt') || fileType.includes('presentation')) return 'presentation';
    return 'generic';
  };

  if (message.sender === "user") {
    return (
      <ChatBubble key={message.id} variant="sent">
        <div className="flex flex-col max-w-[80%]">
          <ChatBubbleMessage variant="sent">
            {message.contentItems.map((item) => {
              if (item.type === "text") {
                return <div key={item.id}>{item.content}</div>;
              } 
              else if (item.type === "image") {
                const imageItem = item as ImageContentItem;
                
                if (!imageItem.imageData) {
                  return (
                    <div key={imageItem.id} className="p-2 bg-red-900/30 rounded-md">
                      <p className="text-red-300 text-xs">이미지 데이터 없음</p>
                    </div>
                  );
                }
                
                const imgSrc = `data:${imageItem.mimeType};base64,${imageItem.imageData}`;
                
                return (
                  <div key={imageItem.id} className="mt-2 mb-2 max-w-full">
                    <div 
                      className="relative rounded-md border border-indigo-500/30 cursor-pointer hover:opacity-90 transition-opacity inline-block"
                      style={{ maxHeight: "200px" }}
                      onClick={() => onSetZoomedImage({
                        isOpen: true,
                        imageData: imageItem.imageData,
                        mimeType: imageItem.mimeType
                      })}
                    >
                      <Image 
                        src={imgSrc}
                        alt="첨부 이미지"
                        width={200}
                        height={200}
                        className="rounded-md max-h-[200px] w-auto object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                );
              }
              else if (item.type === "document") {
                const documentItem = item as DocumentContentItem;
                const fileIcon = getFileIcon(documentItem.fileType);
                const fileSize = documentItem.fileSize < 1024 * 1024 
                  ? `${Math.round(documentItem.fileSize / 1024)} KB` 
                  : `${(documentItem.fileSize / (1024 * 1024)).toFixed(1)} MB`;
                
                const fileExtension = documentItem.filename.split('.').pop()?.toUpperCase() || '';
                
                return (
                  <div key={documentItem.id} className="mt-2 mb-2">
                    <div className="flex border border-gray-700 bg-gray-800/50 rounded-md p-3 max-w-[350px]">
                      <div className="mr-3 h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-md bg-indigo-900/40">
                        {fileIcon === 'pdf' && <FileIcon className="h-5 w-5 text-red-400" />}
                        {fileIcon === 'doc' && <FileIcon className="h-5 w-5 text-blue-400" />}
                        {fileIcon === 'sheet' && <FileIcon className="h-5 w-5 text-green-400" />}
                        {fileIcon === 'text' && <FileIcon className="h-5 w-5 text-gray-400" />}
                        {fileIcon === 'image' && <FileIcon className="h-5 w-5 text-purple-400" />}
                        {fileIcon === 'html' && <FileIcon className="h-5 w-5 text-orange-400" />}
                        {fileIcon === 'code' && <FileIcon className="h-5 w-5 text-cyan-400" />}
                        {fileIcon === 'archive' && <FileIcon className="h-5 w-5 text-yellow-400" />}
                        {fileIcon === 'presentation' && <FileIcon className="h-5 w-5 text-pink-400" />}
                        {fileIcon === 'generic' && <FileIcon className="h-5 w-5 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-200 truncate">
                            {documentItem.filename}
                          </p>
                          <p className="ml-2 text-xs text-gray-400 whitespace-nowrap">{fileExtension}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">
                            {fileSize}
                          </p>
                          <button 
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center"
                            onClick={() => {
                              if (documentItem.fileId) {
                                onOpenFileInNewTab(documentItem.fileId, documentItem.filename);
                              } else if (documentItem.fileUrl) {
                                window.open(documentItem.fileUrl, '_blank', 'noopener,noreferrer');
                              } else {
                                alert('이 파일은 현재 볼 수 없습니다.');
                              }
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            <span>보기</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </ChatBubbleMessage>
        </div>
      </ChatBubble>
    );
  }

  // AI 메시지
  return (
    <div key={message.id} className="mb-6">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="text-gray-200 whitespace-pre-wrap text-sm">
            {message.contentItems.length === 0 && message.isStreaming && (
              <div className="flex items-center justify-center py-3">
                <MessageLoading />
              </div>
            )}
            {message.contentItems.map((item, index) => 
              <ContentRenderer
                key={item.id}
                item={item}
                index={index}
                isStreaming={!!message.isStreaming}
                messageId={message.id}
                fadeDuration={fadeDuration}
                onToggleToolCollapse={onToggleToolCollapse}
                onSetZoomedImage={onSetZoomedImage}
                onOpenFileInNewTab={onOpenFileInNewTab}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};