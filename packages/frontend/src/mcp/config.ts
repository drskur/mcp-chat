import { loadSettings, saveSettingByPath } from '@/lib/settings';
import { ClientConfig } from '@langchain/mcp-adapters';

export async function loadMcpConfig(
  name: string = 'default',
): Promise<ClientConfig> {
  const settings = await loadSettings();

  return settings.mcp?.[name] ?? { mcpServers: {} };
}

export async function saveMcpConfig(name: string, config: ClientConfig) {
  return saveSettingByPath(`mcp.${name}`, config);
}