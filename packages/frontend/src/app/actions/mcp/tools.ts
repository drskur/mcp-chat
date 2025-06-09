'use server';

import { MCPServer, MCPTool } from '@/types/mcp';
import { MCPClientManager } from '@/mcp/mcp-client-manager';

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