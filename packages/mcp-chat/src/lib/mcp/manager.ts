import type {StructuredToolInterface} from "@langchain/core/tools";
import {auth} from "@modelcontextprotocol/sdk/client/auth.js";
import {getServerConfig} from "@/lib/config";
import {McpClient} from "@/lib/mcp/mcp-client";
import type {MCPServerStatus} from "@/types/mcp";

export class MCPClientManager {
    private static instance: MCPClientManager;
    private client: McpClient | null = null;

    private constructor() {
    }

    static async getInstance(): Promise<MCPClientManager> {
        if (!MCPClientManager.instance) {
            console.log("Create new MCPClientManager");
            MCPClientManager.instance = new MCPClientManager();
            await MCPClientManager.instance._initialize();
        }
        return MCPClientManager.instance;
    }

    private async _initialize(): Promise<void> {
        const config = getServerConfig();
        const mcpServers = config.get("mcpServers");
        console.log("initailize server config: ", mcpServers);
        this.client = new McpClient({mcpServers});

        await this.client.initializeConnections();
        const tools = await this.client.getTools();

        console.log(
            `MCP client initialized with ${tools.length} tools from ${Object.keys(mcpServers).length} servers`,
        );
    }

    async getTools(): Promise<StructuredToolInterface[]> {
        return this.client?.getTools() ?? [];
    }

    async getClient(): Promise<McpClient | null> {
        return this.client;
    }

    async refreshConnections(): Promise<void> {
        console.log("MCPClientManager: Starting connection refresh");

        await this._initialize();

        console.log(
            `MCPClientManager: Refresh complete, tools count: ${(await this.getTools()).length}`,
        );
    }

    async close(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
    }

    async handleOAuthCallback(
        serverName: string,
        code: string,
    ): Promise<boolean> {
        console.log(
            `Handling OAuth callback for server: ${serverName} with code: ${code.substring(0, 10)}...`,
        );

        if (!this.client) {
            console.error("No client available for OAuth callback after initialization");
            return false;
        }


        const oauthCallback = this.client.getOauthCallback(serverName);
        if (!oauthCallback) {
            console.error(`No OAuth callback found for server: ${serverName}`);
            return false;
        }

        const {authProvider, serverUrl} = oauthCallback;

        // 토큰 교환
        const authResult = await auth(authProvider, {
            serverUrl: serverUrl ?? "",
            authorizationCode: code,
            scope: "profile email",
        });

        if (authResult) {
            const savedTokens = await authProvider.tokens();
            console.log(
                `OAuth authentication successful for server: ${serverName}`,
                savedTokens
                    ? {
                        tokenType: savedTokens.token_type,
                        hasAccessToken: !!savedTokens.access_token,
                        hasRefreshToken: !!savedTokens.refresh_token,
                        expiresIn: savedTokens.expires_in,
                    }
                    : "No tokens found after auth",
            );

            return true;
        } else {
            console.error(
                `OAuth authentication failed for server: ${serverName}: No auth result`,
            );
            return false;
        }
    }

    async getAllServerStatuses(): Promise<MCPServerStatus[]> {

        if (!this.client) {
            return [];
        }

        return this.client.getConnectionStatus();
    }
}

// 편의 함수
export function getMCPManager(): Promise<MCPClientManager> {
    return MCPClientManager.getInstance();
}
