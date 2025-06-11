import { StateAnnotation } from '@/agent/state';
import { BedrockClientManager } from '@/agent/bedrock-client';
import {
  AIMessage,
  AIMessageChunk,
  SystemMessage,
} from '@langchain/core/messages';
import { PromptManager } from '@/agent/prompt';

export async function callModelNode(
  state: typeof StateAnnotation.State,
  _config: any,
) {
  const llm = BedrockClientManager.getInstance().getClient();

  const systemMessage = new SystemMessage({
    content: PromptManager.getInstance().getPrompt(),
  });
  const messages = [systemMessage, ...state.messages];

  const response = await llm.bindTools([]).stream(messages);

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
}
