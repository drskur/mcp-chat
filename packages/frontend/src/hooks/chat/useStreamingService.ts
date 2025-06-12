import React, { useState, useRef } from 'react';
import type { Message, FileAttachment } from '@/types/chat.types';
import { sendChatStream } from '@/app/actions/chat/chat';

interface UseStreamingServiceProps {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const useStreamingService = ({
  setMessages,
}: UseStreamingServiceProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingMessageIdRef = useRef<string | null>(null);

  // 스트리밍 완료
  const completeStreaming = () => {
    setIsStreaming(false);
    streamingMessageIdRef.current = null;
  };

  const startStreaming = async (
    query: string,
    streamingMessageId: string,
    conversationId: string,
    attachments?: FileAttachment[],
  ) => {
    setIsStreaming(true);
    streamingMessageIdRef.current = streamingMessageId;

    const messageStream = await sendChatStream(
      query,
      conversationId,
      attachments,
    );
    const messageStreamReader = messageStream.getReader();

    (async () => {
      while (true) {
        const item = await messageStreamReader.read();
        if (item.done) {
          break;
        }

        const newItem = item.value;
        setMessages((prev) => {
          const currentMessage = prev.find((m) => m.id === streamingMessageId);

          if (!currentMessage) {
            return prev;
          }

          const items = currentMessage.contentItems;
          if (items.length === 0) {
            currentMessage.contentItems = [newItem];
          } else {
            const currentItem = items.at(-1)!;
            if (currentItem.id === newItem.id) {
              items.pop();
            }
            currentMessage.contentItems = [...items, newItem];
          }

          return [...prev];
        });
      }
      completeStreaming();
    })().catch(console.error);
  };

  return {
    isStreaming,
    startStreaming,
    completeStreaming,
  };
};
