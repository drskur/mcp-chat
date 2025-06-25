import {action, query, revalidate} from "@solidjs/router";
import {getServerConfig} from "@/lib/config";
import {refreshWorkflowGraph} from "@/lib/graph/workflow";
import {getMCPManager, MCPClientManager} from "@/lib/mcp";
import type {MCPServerStatus, MCPToolStatus} from "@/types/mcp";

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
        const manager = MCPClientManager.getInstance();
        const tools = await manager.getTools();

        let servers: MCPServerStatus[] = [];
        for (const t of tools) {
            const [sn, tn] = t.name.split("__");
            const server = servers.find(s => s.name === sn);
            if (server) {
                const tool: MCPToolStatus = {
                    name: tn,
                    description: t.description,
                }
                server.tools = [...server.tools, tool]
            } else {
                const server: MCPServerStatus = {
                    name: sn,
                    status: "online",
                    collapse: true,
                    tools: [{
                        name: tn,
                        description: t.description
                    }]
                };
                servers = [...servers, server];
            }
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
    await config.setMCPServerConfig(v);

    const mcpManager = getMCPManager();
    await mcpManager.refreshConnections()

    // MCP 툴이 변경되었으므로 워크플로 그래프를 새로고침
    await refreshWorkflowGraph();

    return revalidate(["mcpServerStatus", "mcpServerConfig"]);
});