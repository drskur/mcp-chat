import {action, query, redirect, revalidate} from "@solidjs/router";
import {getServerConfig} from "@/lib/config";
import {refreshWorkflowGraph} from "@/lib/graph/workflow";
import {getMCPManager, MCPClientManager} from "@/lib/mcp";
import type {MCPServerStatus, MCPToolStatus} from "@/types/mcp";
import {auth} from "@modelcontextprotocol/sdk/client/auth.js";

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

    const config = getServerConfig();
    const mcpServers = config.get("mcpServers") ?? {};

    // 서버가 없으면 빈 배열 반환
    if (Object.keys(mcpServers).length === 0) {
        return [];
    }

    const manager = MCPClientManager.getInstance();
    return await manager.getAllServerStatuses()
}, "mcpServerStatus");

export const setMCPConfigAction = action(async (v: Record<string, unknown>) => {
    "use server";

    const config = getServerConfig();

    const currentOAuthData = config.getAllOAuthData();
    const newServerNames = new Set(Object.keys(v));

    for (const serverName of Object.keys(currentOAuthData)) {
        if (!newServerNames.has(serverName)) {
            config.deleteOAuthServerData(serverName);
        }
    }

    await config.setMCPServerConfig(v);

    // const mcpManager = getMCPManager();
    // await mcpManager.refreshConnections();

    // MCP 툴이 변경되었으므로 워크플로 그래프를 새로고침
    // await refreshWorkflowGraph();

    return revalidate(["mcpServerStatus", "mcpServerConfig"]);
});

export const refreshMCPServerStatusAction = action(async () => {
    "use server";

    const manager = MCPClientManager.getInstance();
    await manager.refreshConnections();
    await refreshWorkflowGraph();

    return revalidate(["mcpServerStatus"]);
});

export const startOAuthFlowAction = action(async (serverName: string) => {
    "use server";

    const manager = getMCPManager();
    const client = await manager.getClient();
    if (!client) {
        throw new Error("MCP client not available");
    }

    const {authProvider, serverUrl} = client.getOauthCallback(serverName);
    await auth(authProvider, {
        serverUrl,
        scope: "profile email",
    });

    const authUrl = await authProvider.getAuthUrl();
    if (!authUrl) {
        throw new Error("Failed to generate OAuth authorization URL");
    }

    const authUrlObj = new URL(authUrl);
    const stateData = {
        serverName,
        timestamp: Date.now(),
    };

    const encodedState = Buffer.from(JSON.stringify(stateData)).toString("base64");
    authUrlObj.searchParams.set("state", encodedState);

    return redirect(authUrlObj.toString());
});
