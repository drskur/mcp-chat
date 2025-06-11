import React from 'react';
import { ExternalLink } from "lucide-react";
import { ChatBubble, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { MessageLoading } from "@/components/ui/message-loading";
import { ContentRenderer } from './ContentRenderer';
import type { Message, ImageContentItem, DocumentContentItem, ZoomedImageState } from '../types/chat.types';
import { FileIconWithColor, formatFileSize, getFileExtension } from '../utils/fileUtils';

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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={imgSrc}
                        alt="첨부 이미지"
                        className="rounded-md max-h-[200px] w-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                  </div>
                );
              }
              else if (item.type === "document") {
                const documentItem = item as DocumentContentItem;
                const fileSize = formatFileSize(documentItem.fileSize);
                const fileExtension = getFileExtension(documentItem.filename);
                
                return (
                  <div key={documentItem.id} className="mt-2 mb-2">
                    <div className="flex border border-gray-700 bg-gray-800/50 rounded-md p-3 max-w-[350px]">
                      <div className="mr-3 h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-md bg-indigo-900/40">
                        <FileIconWithColor fileType={documentItem.fileType} />
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