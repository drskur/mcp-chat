'use server';

import { BedrockClientManager } from '@/app/actions/agent/bedrock-client';
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { PromptManager } from '@/app/actions/agent/prompt';
import { MCPClientManager } from '@/mcp/mcp-client-manager';
import { StateAnnotation } from '@/app/actions/agent/agent-state';

export async function callModelNode(
  state: typeof StateAnnotation.State,
  _config: any,
) {
  const llm = BedrockClientManager.getInstance().getClient();
  const mcpClient = await MCPClientManager.getInstance().getClient();
  const tools = (await mcpClient?.getTools()) ?? [];

  const systemMessage = new SystemMessage({
    content: PromptManager.getInstance().getPrompt(),
  });
  const messages = [systemMessage, ...state.messages];

  try {
    const response = await llm.bindTools(tools).stream(messages);

    const aiMessageChunk = (await Array.fromAsync(response)).reduce(
      (acc, chunk) => acc.concat(chunk),
      new AIMessageChunk({ content: '' }),
    );
    const aiMessage = new AIMessage({
      content: aiMessageChunk.content,
      tool_calls: aiMessageChunk.tool_calls,
      invalid_tool_calls: aiMessageChunk.invalid_tool_calls,
      additional_kwargs: aiMessageChunk.additional_kwargs,
      response_metadata: aiMessageChunk.response_metadata,
    });

    // Return only conversation messages (excluding system message) to maintain clean state
    return { messages: [aiMessage] };
  } catch (error) {
    let inputMessage: string;
    const lastMessage = state.messages.at(-1)?.content ?? [];
    if (Array.isArray(lastMessage)) {
      inputMessage = lastMessage
        .map((item) => (item.type === 'text' ? item.text : ''))
        .join(' ');
    } else {
      inputMessage = lastMessage;
    }

    const errorContent = `
    Input: '${inputMessage}'
    Error: '${error?.toString()}'
    
    - Write error messages in a user-friendly manner.
    - Determine the language of the input message and respond in that language.
    `;
    console.log(errorContent);
    const errorMessage = new HumanMessage({
      content: errorContent,
    });
    const response = await llm.stream([errorMessage]);

    const aiMessageChunk = (await Array.fromAsync(response)).reduce(
      (acc, chunk) => acc.concat(chunk),
      new AIMessageChunk({ content: '' }),
    );
    const aiMessage = new AIMessage({
      content: aiMessageChunk.content,
      tool_calls: aiMessageChunk.tool_calls,
      response_metadata: aiMessageChunk.response_metadata,
    });

    // Return only conversation messages (excluding system message) to maintain clean state
    return { messages: [aiMessage] };
  }
}
