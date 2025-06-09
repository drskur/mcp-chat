import { loadSettings } from '@/lib/settings';
import { ClientConfig } from '@langchain/mcp-adapters';

export async function loadMcpConfig(
  name: string = 'default',
): Promise<ClientConfig> {
  const settings = await loadSettings();

  return settings.mcp?.[name] ?? { mcpServers: {} };
}
