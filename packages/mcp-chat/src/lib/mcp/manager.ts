import type {StructuredToolInterface} from "@langchain/core/tools";
import {auth} from "@modelcontextprotocol/sdk/client/auth.js";
import {getServerConfig} from "@/lib/config";
import {McpClient} from "@/lib/mcp/mcp-client";
import {createOAuthProvider} from "@/lib/mcp/oauth";
import type {MCPServerStatus} from "@/types/mcp";

export class MCPClientManager {
    private static instance: MCPClientManager;
    private client: McpClient | null = null;

    private constructor() {
    }

    static async getInstance(): Promise<MCPClientManager> {
        if (!MCPClientManager.instance) {
            console.log("Create new MCPClientManager - stack trace:", new Error().stack);
            MCPClientManager.instance = new MCPClientManager();
            await MCPClientManager.instance._initialize();
        } else {
            console.log("Using existing MCPClientManager instance");
        }
        return MCPClientManager.instance;
    }


    private async _initialize(): Promise<void> {
        const config = getServerConfig();
        const mcpServers = config.get("mcpServers");
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

        // 기존 OAuth 콜백 정보 보존
        const existingOAuthCallbacks = this.client?.getAllOauthCallbacks() ?? {};

        await this._initialize();

        // OAuth 콜백 정보 복원
        if (this.client && Object.keys(existingOAuthCallbacks).length > 0) {
            this.client.restoreOauthCallbacks(existingOAuthCallbacks);
            console.log("OAuth callbacks restored:", Object.keys(existingOAuthCallbacks));
        }

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

    async startOauthAuthorization(serverName: string): Promise<string> {
        if (!this.client) {
            console.error("No client available for OAuth callback after initialization");
            return "";
        }

        const oauthCallback = this.client.getOauthCallback(serverName);
        if (!oauthCallback) {
            console.error(`No OAuth callback found for server: ${serverName}`);
            return "";
        }

        const {authProvider, serverUrl} = oauthCallback;

        // 토큰 교환
        await auth(authProvider, {
            serverUrl: serverUrl ?? "",
            scope: "profile email",
        });

        this.client.setOAuthProvider(serverName, authProvider);

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

        return authUrlObj.toString();
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

        let oauthCallback = this.client.getOauthCallback(serverName);
        if (!oauthCallback) {
            console.log(`No OAuth callback found for server: ${serverName}, creating new one`);
            
            // 서버 설정에서 URL 가져오기
            const config = getServerConfig();
            const mcpServers = config.get("mcpServers");
            const serverConfig = mcpServers[serverName];
            
            if (!serverConfig || !("url" in serverConfig)) {
                console.error(`Server ${serverName} not found in config or not URL type`);
                return false;
            }
            
            // 새로운 OAuth provider 생성
            const authProvider = createOAuthProvider(serverName);
            oauthCallback = {
                authProvider,
                serverUrl: serverConfig.url
            };
            
            // McpClient에 OAuth 콜백 정보 설정
            this.client.restoreOauthCallbacks({
                [serverName]: oauthCallback
            });
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
