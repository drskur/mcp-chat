'use server';

import { graph } from '@/agent/workflow';
import { AIMessage } from '@langchain/core/messages';

export async function sendChat(
  message: string,
  conversationId?: string,
): Promise<void> {
  const aiMessage = new AIMessage({
    content: message,
  });

  const configurable = {
    thread_id: conversationId ?? 'default_conversation',
  };
  const response = await graph.stream(
    {
      messages: [aiMessage],
    },
    { configurable },
  );

  for await (const chunk of response) {
    console.log(chunk);
  }
}
