'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { ChatMessageList } from '@/components/ui/chat-message-list';
import { v4 as uuidv4 } from 'uuid';

// 새로운 hooks과 components import
import { useMessageManager } from '@/hooks/chat/useMessageManager';
import { useStreamingService } from '@/hooks/chat/useStreamingService';
import { useScrollControl } from '@/hooks/core/useScrollControl';

import { MessageBubble } from './components/MessageBubble';
import { FilePreview } from './components/FilePreview';
import { ChatInput } from './components/ChatInput';
import { ImageZoom } from './components/ImageZoom';

import type { ChatInterfaceProps, ZoomedImageState } from '@/types/chat.types';
import { useFileManager } from '@/hooks';
import styles from './ChatInterface.module.css';

export function ChatInterface({
  initialMessage,
  initialAttachments,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [conversationId] = useState(() => uuidv4());
  const [zoomedImage, setZoomedImage] = useState<ZoomedImageState>({
    isOpen: false,
    imageData: '',
    mimeType: '',
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const FADE_DURATION = 800;

  // Custom hooks 사용
  const fileAttachment = useFileManager();
  
  const messageManager = useMessageManager({
    initialMessage,
    initialAttachments,
    dbReady: fileAttachment.dbReady,
    saveFileToIndexedDB: fileAttachment.saveFileToIndexedDB,
  });

  const streamingService = useStreamingService({
    setMessages: messageManager.setMessages,
  });
  
  const {
    scrollRef: scrollContainerRef,
    messagesEndRef,
    showScrollButton,
    userHasScrolled,
    isAtBottom,
    scrollToBottom
  } = useScrollControl({
    smooth: true
  });

  // 입력 상태 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // 폼 제출 핸들러
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // 이벤트 버블링 방지

    if (
      (!input.trim() && fileAttachment.attachments.length === 0) ||
      streamingService.isStreaming
    ) {
      return;
    }

    // 첨부파일을 미리 저장
    const currentAttachments = [...fileAttachment.attachments];
    
    // 사용자 메시지 추가
    await messageManager.addUserMessage(input, currentAttachments);
    setInput('');

    // 첨부 파일 목록 초기화 (UI에서 먼저 비우기)
    fileAttachment.clearAttachments();

    // AI 메시지 추가 및 스트리밍 시작
    const aiMessageId = messageManager.addAiMessage();
    await streamingService.startStreaming(input, aiMessageId, conversationId, currentAttachments);

    // 하단으로 스크롤
    setTimeout(() => scrollToBottom(), 100);
  };

  // 메시지가 추가되거나 변경될 때마다 조건부 스크롤
  useEffect(() => {
    if (messageManager.messages.length > 0) {
      if (!userHasScrolled || isAtBottom) {
        setTimeout(() => scrollToBottom(), 0);
      }
    }
  }, [messageManager.messages.length, userHasScrolled, isAtBottom, scrollToBottom]);

  // 스트리밍이 시작될 때 항상 스크롤 다운
  useEffect(() => {
    if (streamingService.isStreaming) {
      scrollToBottom();
    }
  }, [streamingService.isStreaming, scrollToBottom]);

  // 페이드 효과를 위한 주기적 리렌더링
  useEffect(() => {
    if (!streamingService.isStreaming) return;

    const timer = setInterval(() => {
      messageManager.setMessages((prev) => [...prev]);
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
    const handleInitialMessage = async () => {
      if (
        initialMessage &&
        messageManager.messages.length === 1 &&
        !streamingService.isStreaming
      ) {
        // AI 메시지 추가 및 스트리밍 시작
        const aiMessageId = messageManager.addAiMessage();
        console.log('aiMessageId', aiMessageId);
        await streamingService.startStreaming(initialMessage, aiMessageId, conversationId, initialAttachments);
      }
    };

    handleInitialMessage();
  }, [
    initialMessage,
    messageManager.messages.length,
    streamingService.isStreaming,
    streamingService,
    messageManager,
    initialAttachments,
    conversationId,
  ]);

  return (
    <>
      <div className="flex h-full w-full overflow-hidden">
        <div className="flex flex-col w-full h-full">
          {/* 메시지 영역 */}
          <div
            ref={scrollContainerRef}
            className={styles.messageContainer + ' ' + styles.hideScrollbar}
          >
            <div className={styles.messageListWrapper}>
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
              <div ref={messagesEndRef} />
            </div>

            {/* 하단으로 스크롤 버튼 */}
            {showScrollButton && (
              <button
                onClick={() => scrollToBottom()}
                className={styles.scrollButton}
                aria-label="하단으로 스크롤"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* 입력창 영역 */}
          <div className={styles.inputArea}>
            <div className={styles.inputWrapper}>
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
        onClose={() => setZoomedImage((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
