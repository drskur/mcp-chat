import { loadSettings, saveSettingByPath } from '@/lib/config/settings';
import { ClientConfig } from '@langchain/mcp-adapters';
import { DEFAULT_AGENT_NAME } from '@/types/settings.types';

export async function loadMcpConfig(
  name: string = DEFAULT_AGENT_NAME,
): Promise<ClientConfig> {
  const settings = await loadSettings();

  return settings.agents?.[name]?.mcp ?? { mcpServers: {} };
}

export async function saveMcpConfig(name: string, config: ClientConfig) {
  return saveSettingByPath(`agents.${name}.mcp`, config);
}
