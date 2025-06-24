import {action, query, revalidate} from "@solidjs/router";
import {getServerConfig} from "@/lib/config";
import {MCPClientManager} from "@/lib/mcp";
import {MCPServerStatus, MCPToolStatus} from "@/types/mcp";

export const getMCPServerConfigQuery = query(async () => {
    "use server";

    const config = getServerConfig();
    return config.get("mcpServers");
}, "mcpServerConfig");

export const getMCPServerStatusQuery = query(async () => {
    "use server";

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

}, "mcpServerStatus");

export const setMCPConfigAction = action(async (v: Record<string, unknown>) => {
    "use server";

    const config = getServerConfig();
    await config.setMCPServerConfig(v);

    return revalidate(["mcpServerStatus", "mcpServerConfig"]);
});