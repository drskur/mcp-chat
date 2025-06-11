'use server';

import { BedrockClientManager } from '@/agent/bedrock-client';
import { loadSettings } from '@/lib/settings';
import { env } from '@/lib/env';

export async function initializeBedrockClient(agentName: string) {
  try {
    const settings = await loadSettings();
    const modelId =
      settings.agents[agentName]?.model ||
      'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

    const manager = BedrockClientManager.getInstance();
    const config = createBedrockConfig(modelId);
    manager.updateConfig(config);

    return {
      success: true,
      model: modelId,
      initialized: manager.isInitialized(),
    };
  } catch (error) {
    console.error('Failed to initialize Bedrock client:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateBedrockModel(modelId: string) {
  try {
    const manager = BedrockClientManager.getInstance();
    const config = createBedrockConfig(modelId);
    manager.updateConfig(config);

    return {
      success: true,
      model: modelId,
    };
  } catch (error) {
    console.error('Failed to update Bedrock model:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function createBedrockConfig(modelId: string) {
  return {
    model: modelId,
    region: env.AWS_REGION,
    temperature: 0.7,
    maxTokens: 4096,
  };
}
