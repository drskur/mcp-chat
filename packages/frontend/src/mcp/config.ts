import { loadSettings, saveSettingByPath } from '@/lib/settings';
import { ClientConfig } from '@langchain/mcp-adapters';
import { DEFAULT_AGENT_NAME } from '@/types/settings.types';

export async function loadMcpConfig(
  name: string = DEFAULT_AGENT_NAME,
): Promise<ClientConfig> {
  const settings = await loadSettings();

  return settings.mcp?.[name] ?? { mcpServers: {} };
}

export async function saveMcpConfig(name: string, config: ClientConfig) {
  return saveSettingByPath(`mcp.${name}`, config);
}
