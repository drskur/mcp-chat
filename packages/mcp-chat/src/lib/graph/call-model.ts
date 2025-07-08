"use server";

import { ChatBedrockConverse } from "@langchain/aws";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { getServerConfig } from "@/lib/config";
import type { StateAnnotation } from "@/lib/graph/state";
import { getMCPManager } from "@/lib/mcp";

export async function callModel(state: typeof StateAnnotation.State) {
  const modelConfig = getServerConfig().get("model");

  const [crossRegionPrefix] = modelConfig.region.split("-");
  const modelId = `${crossRegionPrefix}.${modelConfig.model.modelId}`;
  const llm = new ChatBedrockConverse({
    model: modelId,
    region: modelConfig.region,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
  });

  const tools = await getMCPManager().getTools();

  const systemMessage = new SystemMessage({
    content: `${modelConfig.systemPrompt}\n\n${currentDatePrompt()}`,
  });
  const input = [systemMessage, ...state.messages];

  const res = await llm.bindTools(tools).invoke(input);

  const aiMessage = new AIMessage({
    content: res.content,
    tool_calls: res.tool_calls,
  });

  return { messages: [aiMessage] };
}

const currentDatePrompt = () => {
  const now = new Date();

  return `Now is ${now.toISOString()}. You should be aware of the current date and time when providing responses, especially for time-sensitive information, scheduling, or when referencing recent events. Always consider the temporal context when answering questions.`;
};
