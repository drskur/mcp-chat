import { ChatBedrockConverse } from '@langchain/aws';
import { DEFAULT_AWS_REGION } from '@/lib/env';

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

export class BedrockClientManager {
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

  updateConfig(config: BedrockConfig): void {
    this.config = config;
    this.client = this.createClient();
  }

  private createClient(): ChatBedrockConverse {
    if (!this.config) {
      throw new Error('Configuration is not set');
    }

    return new ChatBedrockConverse({
      model: this.config.model,
      region: this.config.region || DEFAULT_AWS_REGION,
      credentials: this.config.credentials,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });
  }

  getClient(): ChatBedrockConverse {
    if (!this.client) {
      throw new Error('Client is not initialized. Call updateConfig first.');
    }
    return this.client;
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  getConfig(): BedrockConfig | null {
    return this.config;
  }
}