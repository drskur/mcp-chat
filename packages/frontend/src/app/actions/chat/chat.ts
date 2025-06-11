'use server';

import { graph } from '@/agent/workflow';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { StateAnnotation } from '@/agent/state';
import type { Message } from '@/types/chat.types';
import { randomUUID } from 'node:crypto';

export interface ChatChunk {
  callModel: typeof StateAnnotation.State;
}

export async function sendChatStream(message: string, conversationId?: string) {
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
    { configurable },
  );
  return new ReadableStream<Message>({
    async start(controller) {
      try {
        for await (const chunk of response) {
          const messages = (chunk as ChatChunk).callModel.messages ?? [];
          const lastMessage = messages.at(-1);

          if (lastMessage instanceof AIMessage) {
            const message: Message = {
              id: lastMessage.id ?? '',
              sender: 'ai',
              contentItems: [
                {
                  id: randomUUID(),
                  type: 'text',
                  content: (lastMessage.content as string) ?? '',
                  timestamp: Date.now(),
                },
              ],
              isStreaming: false,
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
