'use server';

import { MCPServer } from '@/types/mcp';
import { MCPClientManager } from '@/mcp/mcp-client-manager';
import { loadMcpConfig, saveMcpConfig } from '@/mcp/config';
import { ClientConfig } from '@langchain/mcp-adapters';
import { DEFAULT_AGENT_NAME } from '@/types/settings.types';
import { resetGraph, getGraph } from '@/app/actions/agent/workflow';

export async function getMCPConfig(
  name: string = DEFAULT_AGENT_NAME,
): Promise<ClientConfig> {
  return loadMcpConfig(name);
}

export async function setMCPConfig(name: string, config: ClientConfig) {
  const result = await saveMcpConfig(name, config);
  // MCP 설정 변경 후 그래프와 클라이언트 매니저 재초기화
  await resetGraph();
  // 새로운 그래프를 즉시 생성하여 도구가 준비되도록 함
  await getGraph();
  return result;
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
        // Convert LangChain objects to plain objects
        server.tools = tools.map((t) => ({
          name: t.name,
          description: t.description || '',
          status: 'ready' as const,
        }));
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

