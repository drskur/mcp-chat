import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  Message,
  StreamData,
  FileAttachment,
  ToolUseContentItem,
} from '../types/chat.types';
import { sendChat } from '@/app/actions/chat/chat';

interface UseStreamingServiceProps {
  modelId: string;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const useStreamingService = ({
  modelId,
  setMessages,
}: UseStreamingServiceProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingMessageIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 파일 형식 및 크기 검증
  const validateFiles = (files: FileAttachment[]) => {
    const allowedDocFormats = [
      'pdf',
      'csv',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'html',
      'txt',
      'md',
    ];
    const allowedImageFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const maxIndividualSize = 4.5 * 1024 * 1024; // 4.5MB
    const maxTotalSize = 25 * 1024 * 1024; // 25MB

    let totalSize = 0;
    const errors: string[] = [];

    for (const attachment of files) {
      const fileName = attachment.file.name;
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
      const isValidFormat = [
        ...allowedDocFormats,
        ...allowedImageFormats,
      ].includes(fileExt);

      if (!isValidFormat) {
        errors.push(
          `"${fileName}": 지원하지 않는 파일 형식입니다. 지원 형식: 문서(${allowedDocFormats.join(', ')}), 이미지(${allowedImageFormats.join(', ')})`,
        );
        continue;
      }

      if (attachment.file.size > maxIndividualSize) {
        errors.push(`"${fileName}": 파일 크기가 너무 큽니다 (최대 4.5MB).`);
        continue;
      }

      totalSize += attachment.file.size;
    }

    if (totalSize > maxTotalSize) {
      errors.push(`전체 첨부 파일 크기가 제한(25MB)을 초과했습니다.`);
    }

    return { valid: errors.length === 0, errors };
  };

  // 스트림 청크 처리
  const processStreamChunk = (data: string) => {
    if (!data.trim()) return;

    try {
      if (data === '[DONE]') {
        setMessages((prev) => {
          const newMessages = [...prev];
          const currentMessageIndex = newMessages.findIndex(
            (msg) => msg.id === streamingMessageIdRef.current,
          );

          if (currentMessageIndex === -1) return prev;

          const currentMessage = { ...newMessages[currentMessageIndex] };
          const contentItems = [...currentMessage.contentItems].map((item) => {
            if (item.type === 'tool_use' || item.type === 'tool_result') {
              return {
                ...item,
                collapsed: true,
              };
            }
            return item;
          });

          currentMessage.contentItems = contentItems;
          newMessages[currentMessageIndex] = currentMessage;
          return newMessages;
        });

        completeStreaming();
        return;
      }

      const parsedData: StreamData = JSON.parse(
        data.startsWith('data: ') ? data.substring(6) : data,
      );
      const chunk = parsedData.chunk || [];

      if (!chunk || chunk.length === 0) {
        return;
      }

      setMessages((prev) => {
        const newMessages = [...prev];
        const currentMessageIndex = newMessages.findIndex(
          (msg) => msg.id === streamingMessageIdRef.current,
        );

        if (currentMessageIndex === -1) return prev;

        const currentMessage = { ...newMessages[currentMessageIndex] };
        const contentItems = [...currentMessage.contentItems];

        for (const item of chunk) {
          const timestamp = Date.now();

          if (item.type === 'text') {
            const newText = item.text || '';
            if (newText.trim()) {
              currentMessage.content += newText;

              contentItems.push({
                id: uuidv4(),
                type: 'text',
                content: newText,
                timestamp,
              });
            }
          } else if (item.type === 'tool_use') {
            if (item.name) {
              contentItems.push({
                id: item.id || uuidv4(),
                type: 'tool_use',
                name: item.name,
                input: item.input || '',
                timestamp,
                collapsed: false,
              });
            } else if (item.input !== undefined) {
              const lastToolUseIndex = contentItems
                .map((item, idx) => ({ item, idx }))
                .filter(({ item }) => item.type === 'tool_use')
                .pop()?.idx;

              if (lastToolUseIndex !== undefined) {
                const lastToolUse = contentItems[
                  lastToolUseIndex
                ] as ToolUseContentItem;
                contentItems[lastToolUseIndex] = {
                  ...lastToolUse,
                  input: lastToolUse.input + (item.input || ''),
                  collapsed: false,
                };
              }
            }
          } else if (item.type === 'tool_result') {
            contentItems.push({
              id: uuidv4(),
              type: 'tool_result',
              result: item.text || '',
              timestamp,
              collapsed: false,
            });
          } else if (item.type === 'image') {
            contentItems.push({
              id: uuidv4(),
              type: 'image',
              imageData: item.image_data || '',
              mimeType: item.mime_type || 'image/png',
              timestamp,
            });

            currentMessage.content += '\n[이미지 생성됨]';
          }
        }

        currentMessage.contentItems = contentItems.sort(
          (a, b) => a.timestamp - b.timestamp,
        );

        newMessages[currentMessageIndex] = currentMessage;
        return newMessages;
      });
    } catch {
      // 스트림 청크 처리 오류 시 무시
    }
  };

  // 스트리밍 완료
  const completeStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

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

  const startStreaming = async (query: string, conversationId?: string) => {
    await sendChat(query, conversationId);
  };

  // 스트리밍 시작
  // const startStreaming = (query: string, files: FileAttachment[] = [], streamingMessageId: string) => {
  //   setIsStreaming(true);
  //   streamingMessageIdRef.current = streamingMessageId;
  //
  //   if (eventSourceRef.current) {
  //     eventSourceRef.current.close();
  //   }
  //
  //   if (files.length > 0) {
  //     const validation = validateFiles(files);
  //     if (!validation.valid) {
  //       setMessages(prev => {
  //         const newMessages = [...prev];
  //         const currentMessageIndex = newMessages.findIndex(msg => msg.id === streamingMessageIdRef.current);
  //
  //         if (currentMessageIndex === -1) return prev;
  //
  //         const currentMessage = {...newMessages[currentMessageIndex]};
  //         currentMessage.content = "첨부 파일 오류:\n" + validation.errors.join('\n');
  //         currentMessage.contentItems = [{
  //           id: uuidv4(),
  //           type: "text",
  //           content: "첨부 파일 오류:\n" + validation.errors.join('\n'),
  //           timestamp: Date.now()
  //         }];
  //         currentMessage.isStreaming = false;
  //
  //         newMessages[currentMessageIndex] = currentMessage;
  //         return newMessages;
  //       });
  //
  //       setIsStreaming(false);
  //       return;
  //     }
  //
  //     const fetchWithFiles = async () => {
  //       try {
  //         const formData = new FormData();
  //         formData.append('message', query);
  //         formData.append('stream', 'true');
  //         formData.append('model_id', modelId);
  //
  //         files.forEach(attachment => {
  //           formData.append('files', attachment.file);
  //         });
  //
  //
  //         const response = await fetch('/api/chat', {
  //           method: 'POST',
  //           body: formData,
  //         });
  //
  //         if (!response.ok) {
  //                       throw new Error(`API 요청 오류: ${response.status} ${response.statusText}`);
  //         }
  //
  //         const reader = response.body?.getReader();
  //         if (!reader) {
  //           throw new Error('응답 본문을 읽을 수 없습니다.');
  //         }
  //
  //         const decoder = new TextDecoder();
  //         let buffer = '';
  //
  //         while (true) {
  //           const { done, value } = await reader.read();
  //           if (done) break;
  //
  //           const chunk = decoder.decode(value, { stream: true });
  //           buffer += chunk;
  //
  //           const lines = buffer.split('\n\n');
  //           buffer = lines.pop() || '';
  //
  //           for (const line of lines) {
  //             if (line.trim() === '') continue;
  //
  //             if (line.startsWith('data: ')) {
  //               const data = line.substring(6);
  //               if (data === '[DONE]') {
  //                 completeStreaming();
  //               } else {
  //                 processStreamChunk(data);
  //               }
  //             }
  //           }
  //         }
  //       } catch (error) {
  //
  //         setMessages(prev => {
  //           const newMessages = [...prev];
  //           const currentMessageIndex = newMessages.findIndex(msg => msg.id === streamingMessageIdRef.current);
  //
  //           if (currentMessageIndex === -1) return prev;
  //
  //           const currentMessage = {...newMessages[currentMessageIndex]};
  //           currentMessage.content = `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
  //           currentMessage.contentItems = [{
  //             id: uuidv4(),
  //             type: "text",
  //             content: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
  //             timestamp: Date.now()
  //           }];
  //           currentMessage.isStreaming = false;
  //
  //           newMessages[currentMessageIndex] = currentMessage;
  //           return newMessages;
  //         });
  //
  //         completeStreaming();
  //       }
  //     };
  //
  //     fetchWithFiles();
  //   } else {
  //     const requestData = {
  //       message: query,
  //       stream: true,
  //       model_id: modelId
  //     };
  //
  //     const fetchSSE = async () => {
  //       try {
  //
  //         const response = await fetch('/api/chat', {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json'
  //           },
  //           body: JSON.stringify(requestData)
  //         });
  //
  //         if (!response.ok) {
  //                       throw new Error(`API 요청 오류: ${response.status} ${response.statusText}`);
  //         }
  //
  //         const reader = response.body?.getReader();
  //         if (!reader) {
  //           throw new Error('응답 본문을 읽을 수 없습니다.');
  //         }
  //
  //         const decoder = new TextDecoder();
  //         let buffer = '';
  //
  //         while (true) {
  //           const { done, value } = await reader.read();
  //           if (done) break;
  //
  //           const chunk = decoder.decode(value, { stream: true });
  //           buffer += chunk;
  //
  //           const lines = buffer.split('\n\n');
  //           buffer = lines.pop() || '';
  //
  //           for (const line of lines) {
  //             if (line.trim() === '') continue;
  //
  //             if (line.startsWith('data: ')) {
  //               const data = line.substring(6);
  //               if (data === '[DONE]') {
  //                 completeStreaming();
  //               } else {
  //                 processStreamChunk(data);
  //               }
  //             }
  //           }
  //         }
  //       } catch (error) {
  //
  //         setMessages(prev => {
  //           const newMessages = [...prev];
  //           const currentMessageIndex = newMessages.findIndex(msg => msg.id === streamingMessageIdRef.current);
  //
  //           if (currentMessageIndex === -1) return prev;
  //
  //           const currentMessage = {...newMessages[currentMessageIndex]};
  //           currentMessage.content = `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
  //           currentMessage.contentItems = [{
  //             id: uuidv4(),
  //             type: "text",
  //             content: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
  //             timestamp: Date.now()
  //           }];
  //           currentMessage.isStreaming = false;
  //
  //           newMessages[currentMessageIndex] = currentMessage;
  //           return newMessages;
  //         });
  //
  //         completeStreaming();
  //       }
  //     };
  //
  //     fetchSSE();
  //   }
  // };

  return {
    isStreaming,
    startStreaming,
    completeStreaming,
  };
};
