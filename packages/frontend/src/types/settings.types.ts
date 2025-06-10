import { ClientConfig } from '@langchain/mcp-adapters';

export interface Settings {
  mcp: Record<string, ClientConfig>;
  prompt: Record<string, string>;
  model: Record<string, string>;
}

export const DEFAULT_AGENT_NAME = 'default';