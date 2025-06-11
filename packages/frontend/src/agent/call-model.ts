import { StateAnnotation } from '@/agent/state';
import { ChatBedrockConverse } from '@langchain/aws';
import { BedrockClientManager } from '@/agent/bedrock-client';
import { loadSystemPrompt } from '@/app/actions/prompt';

export function callModelNode(
  state: typeof StateAnnotation.State,
  _config: any,
) {
  const llm = BedrockClientManager.getInstance().getClient();
  const messages = state.messages;

  console.log("callModelNode", messages);

  return { messages: messages };
}
