'use server';

import { graph } from '@/agent/workflow';
import {
  AIMessageChunk,
  HumanMessage,
} from '@langchain/core/messages';
import type { Message } from '@/types/chat.types';
import { randomUUID } from 'node:crypto';

export async function sendChatStream(message: string, conversationId?: string, messageId?: string) {
  const humanMessage = new HumanMessage({
    content: message,
  });

  const configurable = {
    thread_id: conversationId ?? 'default_conversation',
  };

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
        let currentUUID = randomUUID();
        let aiMessageChunk: AIMessageChunk | null = null;
        const aiMessageId = messageId ?? randomUUID();

        for await (const chunk of response) {
          // streamMode: 'messages'를 사용하면 [message, metadata] 형태로 반환됨
          const [streamedMessage] = chunk;

          if (streamedMessage instanceof AIMessageChunk) {
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
            controller.enqueue(message);
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
