import { ClientConfig } from '@langchain/mcp-adapters';

export interface Settings {
  modelId: string;
  mcp: Record<string, ClientConfig>;
}
