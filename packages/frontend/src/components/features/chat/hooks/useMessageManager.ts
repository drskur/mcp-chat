import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, ContentItem, FileAttachment } from '@/types/chat.types';

interface UseMessageManagerProps {
  initialMessage?: string;
  initialAttachments?: FileAttachment[];
  dbReady: boolean;
  saveFileToIndexedDB: (file: File, fileId: string) => Promise<boolean>;
}

export const useMessageManager = ({
  initialMessage,
  initialAttachments,
  dbReady,
  saveFileToIndexedDB,
}: UseMessageManagerProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const initialMessageProcessedRef = useRef<boolean>(false);

  // 대화 초기화 감지
  useEffect(() => {
    const checkResetFlag = () => {
      const resetFlag = localStorage.getItem('mcp_reset_conversation');
      if (resetFlag === 'true') {
        setMessages([]);
        localStorage.removeItem('mcp_reset_conversation');
        initialMessageProcessedRef.current = false;
      }
    };

    checkResetFlag();

    const handleResetEvent = () => {
      checkResetFlag();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mcp_reset_conversation' && e.newValue === 'true') {
        checkResetFlag();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('mcp_reset_conversation', handleResetEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mcp_reset_conversation', handleResetEvent);
    };
  }, []);

  // 파일 확장자로부터 타입 추측
  const getFileTypeFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      txt: 'text/plain',
      md: 'text/markdown',
      html: 'text/html',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  };

  // 파일 URL 생성 함수
  const generateFileUrl = (filename: string): string => {
    const fileExt = filename.split('.').pop()?.toLowerCase() || '';

    if (fileExt === 'pdf') {
      return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    } else if (fileExt === 'doc' || fileExt === 'docx') {
      return 'https://filesamples.com/samples/document/docx/sample3.docx';
    } else if (fileExt === 'xls' || fileExt === 'xlsx' || fileExt === 'csv') {
      return 'https://filesamples.com/samples/document/xlsx/sample1.xlsx';
    } else {
      return 'https://raw.githubusercontent.com/microsoft/vscode/main/README.md';
    }
  };

  // 첨부 파일을 콘텐츠 아이템으로 변환
  const processAttachments = useCallback(
    async (attachments: FileAttachment[]): Promise<ContentItem[]> => {
      const contentItems: ContentItem[] = [];

      for (const attachment of attachments) {
        const fileId = uuidv4();

        try {
          await saveFileToIndexedDB(attachment.file, fileId);
        } catch {
          // 파일 저장 실패 시 무시
        }

        if (attachment.type.startsWith('image/') && attachment.previewUrl) {
          if (attachment.previewUrl.startsWith('data:image/')) {
            const base64Data = attachment.previewUrl.split(',')[1];

            if (base64Data) {
              const imageId = uuidv4();
              contentItems.push({
                id: imageId,
                type: 'image',
                imageData: base64Data,
                mimeType: attachment.type,
                timestamp: Date.now(),
              });
            } else {
              contentItems.push({
                id: uuidv4(),
                type: 'text',
                content: `[이미지 데이터 오류: ${attachment.file.name}]`,
                timestamp: Date.now(),
              });
            }
          } else {
            contentItems.push({
              id: uuidv4(),
              type: 'text',
              content: `[이미지 형식 오류: ${attachment.file.name}]`,
              timestamp: Date.now(),
            });
          }
        } else {
          contentItems.push({
            id: uuidv4(),
            type: 'document',
            filename: attachment.file.name,
            fileType:
              attachment.file.type ||
              getFileTypeFromExtension(attachment.file.name),
            fileSize: attachment.file.size,
            timestamp: Date.now(),
            fileUrl: generateFileUrl(attachment.file.name),
            fileId: fileId,
          });
        }
      }

      return contentItems;
    },
    [saveFileToIndexedDB],
  );

  // 사용자 메시지 추가
  const addUserMessage = useCallback(
    async (input: string, attachments: FileAttachment[] = []) => {
      const contentItems: ContentItem[] = [];

      if (input.trim()) {
        contentItems.push({
          id: uuidv4(),
          type: 'text',
          content: input,
          timestamp: Date.now(),
        });
      }

      const attachmentItems = await processAttachments(attachments);
      contentItems.push(...attachmentItems);

      let messageContent = input;
      if (attachments.length > 0) {
        const fileNames = attachments.map((a) => a.file.name).join(', ');
        if (messageContent.trim()) {
          messageContent += `\n[첨부 파일: ${fileNames}]`;
        } else {
          messageContent = `[첨부 파일: ${fileNames}]`;
        }
      }

      const userMessage: Message = {
        id: uuidv4(),
        sender: 'user',
        contentItems: contentItems,
      };

      setMessages((prev) => [...prev, userMessage]);
      return userMessage.id;
    },
    [processAttachments],
  );

  // AI 메시지 추가 (스트리밍용)
  const addAiMessage = () => {
    const newAiMessageId = uuidv4();

    setMessages((prev) => [
      ...prev,
      {
        id: newAiMessageId,
        content: '',
        sender: 'ai',
        contentItems: [],
        isStreaming: true,
      },
    ]);

    return newAiMessageId;
  };

  // 도구 접기/펼치기 토글 함수
  const toggleToolCollapse = (messageId: string, itemId: string) => {
    setMessages((prev) => {
      const newMessages = [...prev];
      const messageIndex = newMessages.findIndex((msg) => msg.id === messageId);

      if (messageIndex === -1) return prev;

      const message = { ...newMessages[messageIndex] };
      const contentItems = [...message.contentItems].map((item) => {
        if (
          item.id === itemId &&
          (item.type === 'tool_use' || item.type === 'tool_result')
        ) {
          return {
            ...item,
            collapsed: !item.collapsed,
          };
        }
        return item;
      });

      message.contentItems = contentItems;
      newMessages[messageIndex] = message;
      return newMessages;
    });
  };

  // 초기 메시지 처리
  useEffect(() => {
    if (
      (initialMessage ||
        (initialAttachments && initialAttachments.length > 0)) &&
      !initialMessageProcessedRef.current &&
      messages.length === 0 &&
      dbReady
    ) {
      initialMessageProcessedRef.current = true;

      localStorage.removeItem('mcp_initial_message');
      localStorage.removeItem('mcp_initial_attachments');

      setTimeout(async () => {
        try {
          await addUserMessage(initialMessage || '', initialAttachments || []);
        } catch {
          // 초기 메시지 처리 중 오류 발생 시 무시
        }
      }, 300);
    }
  }, [
    initialMessage,
    initialAttachments,
    messages.length,
    dbReady,
    saveFileToIndexedDB,
    addUserMessage,
  ]);

  return {
    messages,
    setMessages,
    addUserMessage,
    addAiMessage,
    toggleToolCollapse,
    processAttachments,
  };
};
