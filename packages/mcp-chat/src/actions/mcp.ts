import { action, query, revalidate, redirect } from "@solidjs/router";
import { getServerConfig } from "@/lib/config";
import { refreshWorkflowGraph } from "@/lib/graph/workflow";
import { getMCPManager, MCPClientManager } from "@/lib/mcp";
import { applyMCPDefaults } from "@/lib/mcp/defaults";
import type { MCPServerStatus, MCPToolStatus } from "@/types/mcp";

export const getMCPServerConfigQuery = query(async () => {
  "use server";

  try {
    const config = getServerConfig();
    return config.get("mcpServers") ?? {};
  } catch (error) {
    console.error("Failed to get MCP server config:", error);
    return {};
  }
}, "mcpServerConfig");

export const getMCPServerStatusQuery = query(async () => {
  "use server";

  try {
    const config = getServerConfig();
    const mcpServers = config.get("mcpServers") ?? {};
    
    // 서버가 없으면 빈 배열 반환
    if (Object.keys(mcpServers).length === 0) {
      return [];
    }

    // 기본값 적용 후 Connection 타입으로 변환
    const connections = applyMCPDefaults(mcpServers);
    
    // 모든 서버의 상태 확인
    const manager = MCPClientManager.getInstance();
    const serverStatuses = await manager.getAllServerStatuses(connections, false);
    
    // 도구 목록 가져오기
    const tools = await manager.getTools();
    
    // 서버별로 상태 정보 구성
    const servers: MCPServerStatus[] = [];
    
    for (const [serverName, connection] of Object.entries(connections)) {
      const status = serverStatuses[serverName];
      const serverTools: MCPToolStatus[] = [];
      
      // 연결 성공한 서버의 도구만 추가
      if (status.success) {
        for (const tool of tools) {
          const [sn, tn] = tool.name.split("__");
          if (sn === serverName) {
            serverTools.push({
              name: tn,
              description: tool.description,
            });
          }
        }
      }
      
      servers.push({
        name: serverName,
        tools: serverTools,
        collapse: true,
        connectionStatus: status,
      });
    }

    return servers;
  } catch (error) {
    console.error("Failed to get MCP server status:", error);
    return [];
  }
}, "mcpServerStatus");

export const setMCPConfigAction = action(async (v: Record<string, unknown>) => {
  "use server";

  const config = getServerConfig();
  
  // 현재 OAuth 데이터에서 새 설정에 없는 서버들 삭제
  const currentOAuthData = config.getAllOAuthData();
  const newServerNames = new Set(Object.keys(v));
  
  for (const serverName of Object.keys(currentOAuthData)) {
    if (!newServerNames.has(serverName)) {
      config.deleteOAuthServerData(serverName);
    }
  }
  
  await config.setMCPServerConfig(v);

  const mcpManager = getMCPManager();
  await mcpManager.refreshConnections();

  // MCP 툴이 변경되었으므로 워크플로 그래프를 새로고침
  await refreshWorkflowGraph();

  return revalidate(["mcpServerStatus", "mcpServerConfig"]);
});

export const refreshMCPServerStatusAction = action(async () => {
  "use server";

  try {
    const config = getServerConfig();
    const mcpServers = config.get("mcpServers") ?? {};
    
    if (Object.keys(mcpServers).length === 0) {
      await revalidate(["mcpServerStatus"]);
      return [];
    }

    // 기본값 적용 후 Connection 타입으로 변환
    const connections = applyMCPDefaults(mcpServers);
    
    // 강제로 모든 서버의 상태 확인
    const manager = MCPClientManager.getInstance();
    const serverStatuses = await manager.getAllServerStatuses(connections, true);
    
    // 도구 목록 가져오기
    const tools = await manager.getTools();
    
    // 서버별로 상태 정보 구성
    const servers: MCPServerStatus[] = [];
    
    for (const [serverName, connection] of Object.entries(connections)) {
      const status = serverStatuses[serverName];
      const serverTools: MCPToolStatus[] = [];
      
      // 연결 성공한 서버의 도구만 추가
      if (status.success) {
        for (const tool of tools) {
          const [sn, tn] = tool.name.split("__");
          if (sn === serverName) {
            serverTools.push({
              name: tn,
              description: tool.description,
            });
          }
        }
      }
      
      servers.push({
        name: serverName,
        tools: serverTools,
        collapse: true,
        connectionStatus: status,
      });
    }

    // 캐시 갱신을 위해 revalidate
    await revalidate(["mcpServerStatus"]);
    
    return servers;
  } catch (error) {
    console.error("Failed to refresh MCP server status:", error);
    await revalidate(["mcpServerStatus"]);
    return [];
  }
});

