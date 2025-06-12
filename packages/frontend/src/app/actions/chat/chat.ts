'use server';

import { getGraph } from '@/app/actions/agent/workflow';
import {
  AIMessageChunk,
  HumanMessage,
  MessageContentComplex,
  MessageContentImageUrl,
  MessageContentText,
} from '@langchain/core/messages';
import type { Message, FileAttachment } from '@/types/chat.types';
import { getSupportedFileExtensions } from '@/lib/utils/fileUtils';
import { randomUUID } from 'node:crypto';

async function createAttachmentContents(attachments: FileAttachment[]) {
  const task = attachments.map(async (attachment) => {
    const fileName = attachment.file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    const imageFormats = getSupportedFileExtensions().image.map((ext) =>
      ext.toLowerCase(),
    );

    if (imageFormats.includes(fileExt)) {
      // 이미지 파일인 경우 base64로 변환하여 추가
      const arrayBuffer = await attachment.file.arrayBuffer();
      const base64String = Buffer.from(arrayBuffer).toString('base64');
      const content: MessageContentImageUrl = {
        type: 'image_url',
        image_url: {
          url: `data:${attachment.file.type};base64,${base64String}`,
        },
      };
      return content;
    } else {
      // 텍스트 파일인 경우 파일 내용을 읽어서 추가
      const fileContent = await attachment.file.text();
      const content: MessageContentText = {
        type: 'text',
        text: `[파일: ${fileName}]\n${fileContent}`,
      };
      return content;
    }
  });

  return Promise.all(task);
}

export async function sendChatStream(
  message: string,
  conversationId?: string,
  messageId?: string,
  attachments?: FileAttachment[],
) {
  // 멀티모달 컨텐츠 배열 생성
  let content: MessageContentComplex[] = [];

  // 텍스트 메시지 추가
  if (message.trim()) {
    content.push({
      type: 'text',
      text: message,
    });
  }

  // 첨부파일 처리
  if (attachments && attachments.length > 0) {
    const attachmentContents = await createAttachmentContents(attachments);
    content = [...content, ...attachmentContents];
  }

  const humanMessage = new HumanMessage({
    content,
  });

  const configurable = {
    thread_id: conversationId ?? 'default_conversation',
  };

  const graph = await getGraph();
  const response = await graph.stream(
    {
      messages: [humanMessage],
    },
    {
      configurable,
      streamMode: 'messages',
    },
  );
  return new ReadableStream<Message>({
    async start(controller) {
      try {
        const currentUUID = randomUUID();
        let aiMessageChunk: AIMessageChunk | null = null;
        const aiMessageId = messageId ?? randomUUID();

        for await (const chunk of response) {
          // streamMode: 'messages'를 사용하면 [message, metadata] 형태로 반환됨
          // chunk가 배열인지 확인하고 적절히 처리
          const streamedMessage = Array.isArray(chunk) ? chunk[0] : chunk;

          switch (true) {
            case streamedMessage instanceof AIMessageChunk:
              if (aiMessageChunk && aiMessageChunk?.id === streamedMessage.id) {
                aiMessageChunk = aiMessageChunk.concat(streamedMessage);
              } else {
                aiMessageChunk = streamedMessage;
              }

              const message: Message = {
                id: aiMessageId,
                sender: 'ai',
                contentItems: [
                  {
                    id: currentUUID,
                    type: 'text',
                    content: aiMessageChunk.content as string,
                    timestamp: Date.now(),
                  },
                ],
                isStreaming: true,
              };
              controller.enqueue(message)
              break;
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
