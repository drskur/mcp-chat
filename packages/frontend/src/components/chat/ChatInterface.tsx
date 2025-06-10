"use client"

import { useState, useRef, useEffect } from "react";
import { ArrowDown } from "lucide-react";
import { ChatMessageList } from "@/components/ui/chat-message-list";

// 새로운 hooks과 components import
import { useScrollManager } from './hooks/useScrollManager';
import { useMessageManager } from './hooks/useMessageManager';
import { useStreamingService } from './hooks/useStreamingService';

import { MessageBubble } from './components/MessageBubble';
import { FilePreview } from './components/FilePreview';
import { ChatInput } from './components/ChatInput';
import { ImageZoom } from './components/ImageZoom';

import type { ChatInterfaceProps, ZoomedImageState } from './types/chat.types';
import { useFileAttachment } from '@/hooks/useFileAttachment';

export function ChatInterface({ modelId = "claude-3-sonnet", initialMessage, initialAttachments }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [zoomedImage, setZoomedImage] = useState<ZoomedImageState>({
    isOpen: false,
    imageData: "",
    mimeType: ""
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const FADE_DURATION = 800;

  // Custom hooks 사용
  const fileAttachment = useFileAttachment();
  const scrollManager = useScrollManager();

  const messageManager = useMessageManager({
    initialMessage,
    initialAttachments,
    dbReady: fileAttachment.dbReady,
    saveFileToIndexedDB: fileAttachment.saveFileToIndexedDB
  });

  const streamingService = useStreamingService({
    modelId,
    setMessages: messageManager.setMessages
  });

  // 애니메이션 키프레임 생성
  const getAnimationStyles = () => `
    @keyframes fadeIn {
      from { 
        opacity: 0;
        transform: translateY(2px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .fade-in {
      animation: fadeIn ${FADE_DURATION/1000}s ease-out forwards;
    }
  `;

  // 입력 상태 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // 폼 제출 핸들러
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // 이벤트 버블링 방지

    if ((!input.trim() && fileAttachment.attachments.length === 0) || streamingService.isStreaming) {
      return;
    }

    // 사용자 메시지 추가
    await messageManager.addUserMessage(input, fileAttachment.attachments);
    setInput("");

    // 보낼 첨부 파일 복사본 저장
    const attachmentsCopy = [...fileAttachment.attachments];

    // 첨부 파일 목록 초기화 (UI에서 먼저 비우기)
    fileAttachment.clearAttachments();

    // AI 메시지 추가 및 스트리밍 시작
    const aiMessageId = messageManager.addAiMessage();
    streamingService.startStreaming(input, attachmentsCopy, aiMessageId);

    // 하단으로 스크롤
    setTimeout(() => scrollManager.scrollToBottom(), 100);
  };

  // 메시지가 추가되거나 변경될 때마다 조건부 스크롤
  useEffect(() => {
    if (messageManager.messages.length > 0) {
      if (!scrollManager.userHasScrolled || scrollManager.isNearBottomRef.current) {
        scrollManager.scrollToBottom();
      }
    }
  }, [messageManager.messages, scrollManager.userHasScrolled, scrollManager]);

  // 스트리밍이 시작될 때 항상 스크롤 다운
  useEffect(() => {
    if (streamingService.isStreaming) {
      scrollManager.scrollToBottom();
    }
  }, [streamingService.isStreaming, scrollManager]);

  // 페이드 효과를 위한 주기적 리렌더링
  useEffect(() => {
    if (!streamingService.isStreaming) return;

    const timer = setInterval(() => {
      messageManager.setMessages(prev => [...prev]);
    }, 50);

    return () => clearInterval(timer);
  }, [streamingService.isStreaming, messageManager]);

  // 컴포넌트 마운트 시 채팅창에 포커스 설정
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 초기 메시지가 있을 때 AI 응답 자동 요청
  useEffect(() => {
    if (initialMessage && messageManager.messages.length === 1 && !streamingService.isStreaming) {
      // AI 메시지 추가 및 스트리밍 시작
      const aiMessageId = messageManager.addAiMessage();
      streamingService.startStreaming(initialMessage, initialAttachments || [], aiMessageId);
    }
  }, [initialMessage, messageManager.messages.length, streamingService.isStreaming, streamingService, messageManager, initialAttachments]);

  return (
    <>
      <div className="flex h-full w-full overflow-hidden">
        {/* 페이드 인 애니메이션을 위한 스타일 */}
        <style dangerouslySetInnerHTML={{ __html: getAnimationStyles() + `
          .hide-scrollbar {
            -ms-overflow-style: none; /* IE and Edge */
            scrollbar-width: none; /* Firefox */
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `}} />

        <div className="flex flex-col w-full h-full">
          {/* 메시지 영역 */}
          <div
            ref={scrollManager.scrollContainerRef}
            className="flex-1 overflow-y-auto hide-scrollbar relative"
          >
            <div className="max-w-3xl mx-auto w-full p-4">
              <ChatMessageList>
                {messageManager.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    fadeDuration={FADE_DURATION}
                    onToggleToolCollapse={messageManager.toggleToolCollapse}
                    onSetZoomedImage={setZoomedImage}
                    onOpenFileInNewTab={fileAttachment.openFileInNewTab}
                  />
                ))}
              </ChatMessageList>
              {/* 스크롤 위치 참조를 위한 빈 div */}
              <div ref={scrollManager.messagesEndRef} />
            </div>

            {/* 하단으로 스크롤 버튼 */}
            {scrollManager.showScrollButton && (
              <button
                onClick={() => scrollManager.scrollToBottom()}
                className="fixed bottom-24 right-8 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-xl transition-all duration-200 z-10 flex items-center justify-center transform hover:scale-110"
                aria-label="하단으로 스크롤"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* 입력창 영역 */}
          <div className="p-4 border-t border-gray-800">
            <div className="max-w-3xl mx-auto w-full">
              {/* 첨부 파일 미리보기 영역 */}
              <FilePreview
                attachments={fileAttachment.attachments}
                onRemoveAttachment={fileAttachment.removeAttachment}
              />

              <ChatInput
                input={input}
                isStreaming={streamingService.isStreaming}
                fileInputRef={fileAttachment.fileInputRef}
                onInputChange={handleInputChange}
                onSubmit={handleFormSubmit}
                onAttachButtonClick={fileAttachment.handleAttachButtonClick}
                onFileUpload={fileAttachment.handleFileUpload}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 확대 보기 모달 */}
      <ImageZoom
        zoomedImage={zoomedImage}
        onClose={() => setZoomedImage(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}