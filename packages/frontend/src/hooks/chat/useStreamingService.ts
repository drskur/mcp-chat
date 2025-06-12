import React, { useState, useRef } from 'react';
import type {
  Message,
  FileAttachment,
} from '@/types/chat.types';
import { sendChatStream } from '@/app/actions/chat/chat';

interface UseStreamingServiceProps {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const useStreamingService = ({
  setMessages,
}: UseStreamingServiceProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingMessageIdRef = useRef<string | null>(null);


  // 스트림 청크 처리
  // const _processStreamChunk = (data: string) => {
  //   if (!data.trim()) return;
  //
  //   try {
  //     if (data === '[DONE]') {
  //       setMessages((prev) => {
  //         const newMessages = [...prev];
  //         const currentMessageIndex = newMessages.findIndex(
  //           (msg) => msg.id === streamingMessageIdRef.current,
  //         );
  //
  //         if (currentMessageIndex === -1) return prev;
  //
  //         const currentMessage = { ...newMessages[currentMessageIndex] };
  //         const contentItems = [...currentMessage.contentItems].map((item) => {
  //           if (item.type === 'tool_use' || item.type === 'tool_result') {
  //             return {
  //               ...item,
  //               collapsed: true,
  //             };
  //           }
  //           return item;
  //         });
  //
  //         currentMessage.contentItems = contentItems;
  //         newMessages[currentMessageIndex] = currentMessage;
  //         return newMessages;
  //       });
  //
  //       completeStreaming();
  //       return;
  //     }
  //
  //     const parsedData: StreamData = JSON.parse(
  //       data.startsWith('data: ') ? data.substring(6) : data,
  //     );
  //     const chunk = parsedData.chunk || [];
  //
  //     if (!chunk || chunk.length === 0) {
  //       return;
  //     }
  //
  //     setMessages((prev) => {
  //       const newMessages = [...prev];
  //       const currentMessageIndex = newMessages.findIndex(
  //         (msg) => msg.id === streamingMessageIdRef.current,
  //       );
  //
  //       if (currentMessageIndex === -1) return prev;
  //
  //       const currentMessage = { ...newMessages[currentMessageIndex] };
  //       const contentItems = [...currentMessage.contentItems];
  //
  //       for (const item of chunk) {
  //         const timestamp = Date.now();
  //
  //         if (item.type === 'text') {
  //           const newText = item.text || '';
  //           if (newText.trim()) {
  //             contentItems.push({
  //               id: uuidv4(),
  //               type: 'text',
  //               content: newText,
  //               timestamp,
  //             });
  //           }
  //         } else if (item.type === 'tool_use') {
  //           if (item.name) {
  //             contentItems.push({
  //               id: item.id || uuidv4(),
  //               type: 'tool_use',
  //               name: item.name,
  //               input: item.input || '',
  //               timestamp,
  //               collapsed: false,
  //             });
  //           } else if (item.input !== undefined) {
  //             const lastToolUseIndex = contentItems
  //               .map((item, idx) => ({ item, idx }))
  //               .filter(({ item }) => item.type === 'tool_use')
  //               .pop()?.idx;
  //
  //             if (lastToolUseIndex !== undefined) {
  //               const lastToolUse = contentItems[
  //                 lastToolUseIndex
  //               ] as ToolUseContentItem;
  //               contentItems[lastToolUseIndex] = {
  //                 ...lastToolUse,
  //                 input: lastToolUse.input + (item.input || ''),
  //                 collapsed: false,
  //               };
  //             }
  //           }
  //         } else if (item.type === 'tool_result') {
  //           contentItems.push({
  //             id: uuidv4(),
  //             type: 'tool_result',
  //             result: item.text || '',
  //             timestamp,
  //             collapsed: false,
  //           });
  //         } else if (item.type === 'image') {
  //           contentItems.push({
  //             id: uuidv4(),
  //             type: 'image',
  //             imageData: item.image_data || '',
  //             mimeType: item.mime_type || 'image/png',
  //             timestamp,
  //           });
  //         }
  //       }
  //
  //       currentMessage.contentItems = contentItems.sort(
  //         (a, b) => a.timestamp - b.timestamp,
  //       );
  //
  //       newMessages[currentMessageIndex] = currentMessage;
  //       return newMessages;
  //     });
  //   } catch {
  //     // 스트림 청크 처리 오류 시 무시
  //   }
  // };

  // 스트리밍 완료
  const completeStreaming = () => {
    setIsStreaming(false);
    streamingMessageIdRef.current = null;

    setMessages((prev) => {
      return prev.map((msg) => {
        if (msg.isStreaming) {
          const updatedContentItems = msg.contentItems.map((item) => {
            if (item.type === 'tool_use' || item.type === 'tool_result') {
              return { ...item, collapsed: true };
            }
            return item;
          });

          return {
            ...msg,
            isStreaming: false,
            contentItems: updatedContentItems,
          };
        }
        return msg;
      });
    });
  };

  const startStreaming = async (
    query: string,
    streamingMessageId: string,
    conversationId: string,
    attachments?: FileAttachment[],
  ) => {
    setIsStreaming(true);
    streamingMessageIdRef.current = streamingMessageId;

    const messageStream = await sendChatStream(query, conversationId, streamingMessageId, attachments);
    const messageStreamReader = messageStream.getReader();

    (async () => {
      while (true) {
        const message = await messageStreamReader.read();
        if (message.done) {
          break;
        }
        setMessages((prev) => {
          const i = prev.findIndex((m) => m.id === message.value.id);
          if (i === -1) {
            return [...prev, message.value];
          } else {
            // 새 배열을 생성하여 React가 변경을 감지할 수 있도록 함
            const newMessages = [...prev];
            newMessages[i] = message.value;
            return newMessages;
          }
        });
      }
    })().catch(console.error);

    completeStreaming();
  };

  return {
    isStreaming,
    startStreaming,
    completeStreaming,
  };
};
