import type { StructuredToolInterface } from "@langchain/core/tools";
import type { ClientConfig, Connection } from "@langchain/mcp-adapters";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { getServerConfig } from "@/lib/config";
import { applyMCPDefaults } from "@/lib/mcp/defaults";
import {
  createOAuthProvider,
  type FileSystemOAuthClientProvider,
} from "@/lib/mcp/oauth";
import { ResilientMultiServerMCPClient } from "@/lib/mcp/resilient-client";
import type { MCPServerConnectionStatus } from "@/types/mcp";

export class MCPClientManager {
  private static instance: MCPClientManager;
  private client: ResilientMultiServerMCPClient | null = null;
  private tools: StructuredToolInterface[] = [];
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

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

      // 서버 설정이 없으면 초기화하지 않음
      if (!mcpServers || Object.keys(mcpServers).length === 0) {
        console.log("No MCP servers configured, skipping initialization");
        this.isInitialized = true;
        return;
      }

      // 기본값 적용 후 Connection 타입으로 변환
      const connections = applyMCPDefaults(mcpServers);

      // ResilientMultiServerMCPClient 생성
      this.client = new ResilientMultiServerMCPClient({
        mcpServers: connections,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: "",
        useStandardContentBlocks: true,
      });

      // 연결 초기화 및 도구 로드
      try {
        await this.client.initializeConnections();
      } catch (initError) {
        console.error("Failed to initialize connections:", initError);
        // throwOnLoadError가 false이므로 계속 진행
      }

      this.tools = await this.client.getTools();

      this.isInitialized = true;
      console.log(
        `MCP client initialized with ${this.tools.length} tools from ${Object.keys(connections).length} servers`,
      );
    } catch (error) {
      console.log(`MCP client initialization failed`);
      console.error("Full error details:", error);
      this.isInitialized = true; // 실패해도 초기화 완료로 표시
      this.tools = [];
    }
  }

  async getTools(): Promise<StructuredToolInterface[]> {
    await this.initialize();
    return this.tools;
  }

  async getClient(): Promise<ResilientMultiServerMCPClient | null> {
    await this.initialize();
    return this.client;
  }

  async refreshConnections(): Promise<void> {
    console.log("MCPClientManager: Starting connection refresh");

    if (this.client) {
      await this.client.close();
    }

    this.client = null;
    this.tools = [];
    this.isInitialized = false;
    this.initPromise = null;

    await this.initialize();

    console.log(
      `MCPClientManager: Refresh complete, tools count: ${this.tools.length}`,
    );
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.tools = [];
    this.isInitialized = false;
    this.initPromise = null;
  }

  isReady(): boolean {
    return this.isInitialized && this.client !== null;
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

      // 해당 서버의 OAuth Provider를 찾기 (없으면 생성)
      let oauthProvider = this.client.getOAuthProvider(serverName);
      if (!oauthProvider) {
        console.log(
          `OAuth provider not found for server: ${serverName}, creating new one`,
        );
        oauthProvider = createOAuthProvider(serverName);
        this.client.setOAuthProvider(serverName, oauthProvider);
      }

      // 해당 서버의 URL을 찾기 (없으면 설정에서 가져오기)
      let serverUrl = this.client.getServerUrl(serverName);
      if (!serverUrl) {
        console.log(
          `Server URL not found in cache for server: ${serverName}, checking config`,
        );
        const config = getServerConfig();
        const mcpServers = config.get("mcpServers") ?? {};
        const serverConfig = mcpServers[serverName];
        if (serverConfig && "url" in serverConfig) {
          serverUrl = serverConfig.url;
          this.client.setServerUrl(serverName, serverUrl ?? "");
          console.log(`Found server URL in config: ${serverUrl}`);
        } else {
          console.error(`Server URL not found for server: ${serverName}`);
          return false;
        }
      }

      // 토큰 교환
      const authResult = await auth(oauthProvider, {
        serverUrl: serverUrl ?? "",
        authorizationCode: code,
        scope: "profile email",
      });

      if (authResult) {
        const savedTokens = await oauthProvider.tokens();
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

        // authUrl 클리어
        await oauthProvider.clearAuthUrl();
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

  async getAllServerStatuses(
    servers: Record<string, Connection>,
    forceRefresh = false,
  ): Promise<Record<string, MCPServerConnectionStatus>> {
    // 클라이언트 초기화 보장
    await this.initialize();
    
    if (!this.client) {
      // 초기화 후에도 클라이언트가 없는 경우 (MCP 서버 설정이 없는 경우)
      const statuses: Record<string, MCPServerConnectionStatus> = {};
      for (const serverName of Object.keys(servers)) {
        statuses[serverName] = {
          success: false,
          error: "No MCP servers configured"
        };
      }
      return statuses;
    }

    // ResilientMultiServerMCPClient에서 상태 정보 가져오기
    let clientStatuses: Record<string, MCPServerConnectionStatus> = {};
    
    if (!forceRefresh) {
      clientStatuses = this.client.getServerStatuses();
    }

    // 요청된 모든 서버에 대해 상태 확인
    const statuses: Record<string, MCPServerConnectionStatus> = {};
    
    for (const [name, connection] of Object.entries(servers)) {
      if (clientStatuses[name] && !forceRefresh) {
        // 캐시된 상태가 있고 강제 새로고침이 아닌 경우
        statuses[name] = clientStatuses[name];
      } else {
        // 캐시된 상태가 없거나 강제 새로고침인 경우 개별 확인
        statuses[name] = await this.client.checkWorking(name, connection);
      }
    }

    return statuses;
  }
}

// 편의 함수
export function getMCPManager(): MCPClientManager {
  return MCPClientManager.getInstance();
}
