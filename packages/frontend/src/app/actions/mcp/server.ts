'use server';

import { MCPServer, MCPTool } from '@/types/mcp';
import { MCPClientManager } from '@/mcp/mcp-client-manager';
import { loadMcpConfig, saveMcpConfig } from '@/mcp/config';
import { ClientConfig } from '@langchain/mcp-adapters';
import { DEFAULT_AGENT_NAME } from '@/types/settings.types';

export async function getMCPConfig(
  name: string = DEFAULT_AGENT_NAME,
): Promise<ClientConfig> {
  return loadMcpConfig(name);
}

export async function setMCPConfig(name: string, config: ClientConfig) {
  return saveMcpConfig(name, config);
}

export async function updateMCPConfig(configName: string) {
  const manager = MCPClientManager.getInstance();
  await manager.updateConfig(configName);
}

export async function getMCPServers(): Promise<{ servers: MCPServer[] }> {
  const manager = MCPClientManager.getInstance();
  const mcpClient = await manager.getClient();
  if (!mcpClient) {
    return { servers: [] };
  }

  const mcpServers = mcpClient.config.mcpServers;
  const tasks = Object.keys(mcpServers).map(async (name) => {
    const config = mcpServers[name];
    const server: MCPServer = {
      name,
      config,
      status: 'offline',
      expanded: false,
      tools: [],
    };
    try {
      const client = await mcpClient.getClient(name);
      if (client) {
        const { tools } = await client.listTools();
        server.tools = tools.map((t) => {
          const tool: MCPTool = {
            name: t.name,
            description: t.description,
            status: 'ready',
          };
          return tool;
        });
      }

      server.status = 'online';
      return server;
    } catch (_e) {
      return server;
    }
  });

  const servers = await Promise.all(tasks);

  return { servers };
}
