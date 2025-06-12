'use server';

import { getGraph } from '@/app/actions/agent/workflow';
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  MessageContentComplex,
  MessageContentImageUrl,
  MessageContentText,
  ToolMessage,
} from '@langchain/core/messages';
import {
  ContentItem,
  FileAttachment,
  TextContentItem,
  ToolResultContentItem,
} from '@/types/chat.types';
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

function processAIMessageChunk(
  currentUUID: string,
  aiMessageChunk: AIMessageChunk | null,
  streamedMessageChunk: AIMessageChunk,
  controller: ReadableStreamDefaultController<ContentItem>,
) {
  const merged = aiMessageChunk
    ? aiMessageChunk.concat(streamedMessageChunk)
    : streamedMessageChunk;

  const item: TextContentItem = {
    id: currentUUID,
    type: 'text',
    content: merged.text,
    timestamp: Date.now(),
  };

  controller.enqueue(item);
  return merged;
}

function processToolMessage(
  toolMessage: ToolMessage,
  controller: ReadableStreamDefaultController<ContentItem>,
) {
  const item: ToolResultContentItem = {
    id: randomUUID(),
    type: 'tool_result',
    timestamp: Date.now(),
    result: toolMessage.content as string,
  };
  controller.enqueue(item);
}

function processAIMessage(
  currentUUID: string,
  aiMessage: AIMessage,
  controller: ReadableStreamDefaultController<ContentItem>,
) {
  let item: ContentItem;
  if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
    const toolCall = aiMessage.tool_calls.at(-1)!;
    item = {
      id: randomUUID(),
      type: 'tool_use',
      name: toolCall.name,
      input: JSON.stringify(toolCall.args, null, 2),
      timestamp: Date.now(),
    };
  } else {
    item = {
      id: currentUUID,
      type: 'text',
      content: aiMessage.text,
      timestamp: Date.now(),
    };
  }

  controller.enqueue(item);
}

export async function sendChatStream(
  message: string,
  conversationId?: string,
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
  const streamResponse = await graph.stream(
    {
      messages: [humanMessage],
    },
    {
      configurable,
      streamMode: 'messages',
    },
  );

  return new ReadableStream<ContentItem>({
    async start(controller) {
      try {
        let currentUUID = randomUUID();
        let aiMessageChunk: AIMessageChunk | null = null;

        for await (const chunk of streamResponse) {
          const streamedMessage = Array.isArray(chunk) ? chunk[0] : chunk;
          switch (true) {
            case streamedMessage instanceof AIMessageChunk:
              aiMessageChunk = processAIMessageChunk(
                currentUUID,
                aiMessageChunk,
                streamedMessage,
                controller,
              );
              break;
            case streamedMessage instanceof AIMessage:
              processAIMessage(currentUUID, streamedMessage, controller);
              currentUUID = randomUUID();
              aiMessageChunk = null;
              break;
            case streamedMessage instanceof ToolMessage:
              processToolMessage(streamedMessage, controller);
              break;
            default:
              console.log(streamedMessage);
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
