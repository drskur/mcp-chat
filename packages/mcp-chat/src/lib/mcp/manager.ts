import type {StructuredToolInterface} from "@langchain/core/tools";
import type {Connection} from "@langchain/mcp-adapters";
import {auth} from "@modelcontextprotocol/sdk/client/auth.js";
import {getServerConfig} from "@/lib/config";
import {McpClient} from "@/lib/mcp/mcp-client";
import {
    createOAuthProvider,
} from "@/lib/mcp/oauth";
import type {MCPServerConnectionStatus, MCPServerStatus} from "@/types/mcp";
import {revalidate} from "@solidjs/router";

export class MCPClientManager {
    private static instance: MCPClientManager;
    private client: McpClient | null = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    private constructor() {
    }

    static getInstance(): MCPClientManager {
        if (!MCPClientManager.instance) {
            MCPClientManager.instance = new MCPClientManager();
        }
        return MCPClientManager.instance;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initialize();
        return this.initPromise;
    }

    private async _initialize(): Promise<void> {
        try {
            const config = getServerConfig();
            const mcpServers = config.get("mcpServers");

            this.client = new McpClient({mcpServers});

            // 연결 초기화 및 도구 로드
            try {
                await this.client.initializeConnections();
            } catch (initError) {
                console.error("Failed to initialize connections:", initError);
            }

            const tools = await this.client.getTools();

            this.isInitialized = true;
            console.log(
                `MCP client initialized with ${tools.length} tools from ${mcpServers.length} servers`,
            );
        } catch (error) {
            console.log(`MCP client initialization failed`);
            this.isInitialized = true; // 실패해도 초기화 완료로 표시
        }
    }

    async getTools(): Promise<StructuredToolInterface[]> {
        await this.initialize();
        return this.client?.getTools() ?? [];
    }

    async getClient(): Promise<McpClient | null> {
        await this.initialize();
        return this.client;
    }

    async refreshConnections(): Promise<void> {
        console.log("MCPClientManager: Starting connection refresh");

        if (this.client) {
            await this.client.close();
        }

        this.client = null;
        this.isInitialized = false;
        this.initPromise = null;

        await this.initialize();

        console.log(
            `MCPClientManager: Refresh complete, tools count: ${(await this.getTools()).length}`,
        );
    }

    async close(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
        this.isInitialized = false;
        this.initPromise = null;
    }

    async handleOAuthCallback(
        serverName: string,
        code: string,
    ): Promise<boolean> {
        try {
            console.log(
                `Handling OAuth callback for server: ${serverName} with code: ${code.substring(0, 10)}...`,
            );

            if (!this.client) {
                console.error("No client available for OAuth callback");
                return false;
            }


            const {authProvider, serverUrl} = this.client.getOauthCallback(serverName);

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
        } catch (error) {
            console.error(`OAuth callback failed for server ${serverName}:`, error);
            return false;
        }
    }

    async getAllServerStatuses(): Promise<MCPServerStatus[]> {
        // 클라이언트 초기화 보장
        await this.initialize();

        if (!this.client) {
            return [];
        }

        return this.client.getConnectionStatus();
    }
}

// 편의 함수
export function getMCPManager(): MCPClientManager {
    return MCPClientManager.getInstance();
}
