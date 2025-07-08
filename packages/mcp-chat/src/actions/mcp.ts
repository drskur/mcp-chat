import { action, query, redirect, revalidate } from "@solidjs/router";
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
    const serverStatuses = await manager.getAllServerStatuses(
      connections,
      false,
    );

    // 도구 목록 가져오기
    const tools = await manager.getTools();

    // 서버별로 상태 정보 구성
    const servers: MCPServerStatus[] = [];

    for (const [serverName, connection] of Object.entries(connections)) {
      const status = serverStatuses[serverName] ?? { 
        success: false, 
        error: "Status not available" 
      };
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
  
  console.log("refreshMCPServerStatusAction: Starting refresh");

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
    console.log("refreshMCPServerStatusAction: Force checking all server statuses");
    const manager = MCPClientManager.getInstance();
    const serverStatuses = await manager.getAllServerStatuses(
      connections,
      true, // forceRefresh = true
    );

    // 도구 목록 가져오기
    const tools = await manager.getTools();

    // 서버별로 상태 정보 구성
    const servers: MCPServerStatus[] = [];

    for (const [serverName, connection] of Object.entries(connections)) {
      const status = serverStatuses[serverName] ?? { 
        success: false, 
        error: "Status not available" 
      };
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
    console.log("refreshMCPServerStatusAction: Revalidating cache");
    await revalidate(["mcpServerStatus"]);
    
    console.log("refreshMCPServerStatusAction: Completed, returning", servers.length, "servers");

    return servers;
  } catch (error) {
    console.error("Failed to refresh MCP server status:", error);
    await revalidate(["mcpServerStatus"]);
    return [];
  }
});

export const startOAuthFlowAction = action(async (serverName: string) => {
  "use server";

  try {
    const config = getServerConfig();
    const mcpServers = config.get("mcpServers") ?? {};
    const serverConfig = mcpServers[serverName];

    if (!serverConfig || !("url" in serverConfig)) {
      throw new Error(`Server ${serverName} not found or not configured`);
    }

    const manager = getMCPManager();
    const client = await manager.getClient();

    if (!client) {
      throw new Error("MCP client not available");
    }

    // OAuth Provider 가져오기 또는 생성
    let oauthProvider = client.getOAuthProvider(serverName);
    if (!oauthProvider) {
      const { createOAuthProvider } = await import("@/lib/mcp/oauth");
      oauthProvider = createOAuthProvider(serverName);
      client.setOAuthProvider(serverName, oauthProvider);
      client.setServerUrl(serverName, serverConfig.url);
    }

    // 이미 유효한 토큰이 있는지 확인
    const existingTokens = await oauthProvider.tokens();
    if (existingTokens?.access_token) {
      console.log(`Server ${serverName} already has valid tokens, redirecting to settings`);
      return redirect("/settings/mcp-servers");
    }

    // MCP SDK를 통해 OAuth 인증 흐름 시작
    const { auth } = await import("@modelcontextprotocol/sdk/client/auth.js");
    
    try {
      await auth(oauthProvider, {
        serverUrl: serverConfig.url,
        scope: "profile email",
      });
    } catch (error) {
      // OAuth 인증 흐름 시작 시 발생하는 에러는 정상적인 리다이렉션 과정
      console.log(`OAuth flow started for server: ${serverName}`);
    }

    // 저장된 authUrl 반환
    const authUrl = await oauthProvider.getAuthUrl();
    if (!authUrl) {
      throw new Error("Failed to generate OAuth authorization URL");
    }

    // State 파라미터 추가
    const authUrlObj = new URL(authUrl);
    const stateData = {
      serverName: serverName,
      timestamp: Date.now(),
    };
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString("base64");
    authUrlObj.searchParams.set("state", encodedState);

    return redirect(authUrlObj.toString());
  } catch (error) {
    console.error(`Failed to start OAuth flow for server ${serverName}:`, error);
    throw error;
  }
});
