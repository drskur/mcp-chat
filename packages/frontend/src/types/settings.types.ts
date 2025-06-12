import { ClientConfig } from '@langchain/mcp-adapters';

export type AgentSettings = Record<string, AgentSetting>;

export interface AgentSetting {
  model: string;
  prompt: string;
  mcp: ClientConfig;
}

export interface UserSetting {
  currentAgent: string;
}

export interface Settings {
  agents: AgentSettings;
  userSetting: UserSetting;
}

export const DEFAULT_AGENT_NAME = 'default';
