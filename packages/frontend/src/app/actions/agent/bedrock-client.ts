'use server';

import { ChatBedrockConverse } from '@langchain/aws';
import { DEFAULT_AWS_REGION } from '@/lib/config/env';
import { getCurrentModelId, loadSettings } from '@/lib/config/settings';
import { env } from '@/lib/config/env';

export interface BedrockConfig {
  model: string;
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  temperature?: number;
  maxTokens?: number;
}

class BedrockClientManager {
  private static instance: BedrockClientManager;
  private client: ChatBedrockConverse | null = null;
  private config: BedrockConfig | null = null;

  private constructor() {}

  static getInstance(): BedrockClientManager {
    if (!BedrockClientManager.instance) {
      BedrockClientManager.instance = new BedrockClientManager();
    }
    return BedrockClientManager.instance;
  }

  async updateConfig(config: BedrockConfig): Promise<void> {
    this.config = config;
    this.client = await this.createClient();
  }

  private async createClient(): Promise<ChatBedrockConverse> {
    if (!this.config) {
      const modelId = await getCurrentModelId();
      this.config = createBedrockConfig(modelId);
    }

    return new ChatBedrockConverse({
      model: this.config.model,
      region: this.config.region || DEFAULT_AWS_REGION,
      credentials: this.config.credentials,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });
  }

  async getClient(): Promise<ChatBedrockConverse> {
    if (!this.client) {
      return this.createClient();
    }
    return this.client;
  }

  isInitialized(): boolean {
    return this.client !== null;
  }
}

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

function createBedrockConfig(modelId: string): BedrockConfig {
  return {
    model: modelId,
    region: env.AWS_REGION,
    temperature: 0.7,
    maxTokens: 4096,
  };
}

export { BedrockClientManager };
