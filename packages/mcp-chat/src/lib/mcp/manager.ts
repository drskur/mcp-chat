import type { StructuredToolInterface } from "@langchain/core/tools";
import {
  type ClientConfig,
  Connection,
  MultiServerMCPClient,
} from "@langchain/mcp-adapters";
import { getServerConfig } from "@/lib/config";
import { applyMCPDefaults } from "@/lib/mcp/defaults";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { FileSystemOAuthClientProvider } from "@/lib/mcp/oauth";
import {
  auth,
  exchangeAuthorization,
  discoverOAuthMetadata,
} from "@modelcontextprotocol/sdk/client/auth.js";
import { redirect } from "@solidjs/router";
import type { MCPServerConnectionStatus } from "@/types/mcp";

export class MCPClientManager {
  private static instance: MCPClientManager;
  private client: MultiServerMCPClient | null = null;
  private tools: StructuredToolInterface[] = [];
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private serverStatusCache: Record<string, MCPServerConnectionStatus> | null =
    null;
  private oauthProviders: Record<string, FileSystemOAuthClientProvider> = {};
  private serverUrls: Record<string, string> = {};

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

  private async findWorkingConnections(
    servers: Record<string, Connection>,
  ): Promise<Record<string, Connection>> {
    const out: Record<string, Connection> = {};
    for (const name of Object.keys(servers)) {
      const connection = servers[name];
      const result = await this.checkWorking(name, connection);
      if (result.success) {
        out[name] = connection;
      }
    }

    return out;
  }

  private async checkWorking(
    serverName: string,
    connection: Connection,
  ): Promise<MCPServerConnectionStatus> {
    const client = new Client({
      name: "tester-client",
      version: "0.0.1",
    });

    try {
      if ("command" in connection) {
        const { command, cwd, args, stderr, env } = connection;
        const transport = new StdioClientTransport({
          command,
          cwd,
          args,
          stderr,
          ...(env ? { env: { PATH: process.env.PATH ?? "", ...env } } : {}),
        });
        await client.connect(transport);
      } else if ("url" in connection) {
        const { url } = connection;
        let capturedAuthUrl: string | undefined;

        // 서버 URL 저장
        this.serverUrls[serverName] = url;

        // OAuth Provider 인스턴스 생성 또는 재사용
        if (!this.oauthProviders[serverName]) {
          this.oauthProviders[serverName] = new FileSystemOAuthClientProvider(
            serverName,
            "http://localhost:3000/oauth/callback",
            {
              client_name: serverName,
              client_uri: "http://localhost:3000",
              redirect_uris: ["http://localhost:3000/oauth/callback"],
              response_types: ["code"],
              grant_types: ["authorization_code", "refresh_token"],
              scope: "profile email",
            },
            // onRedirect 콜백: 인증 URL을 캐치하고 실제 리디렉션하지 않음
            (authUrl: URL) => {
              console.log("OAuth authentication required", authUrl.toString());
              capturedAuthUrl = authUrl.toString();
              // 실제 리디렉션하지 않고 URL만 저장
              throw new Error("OAUTH_REQUIRED");
            },
          );
        }

        // 기존 토큰 정보 확인
        const existingTokens = await this.oauthProviders[serverName].tokens();
        console.log(
          `OAuth tokens for ${serverName}:`,
          existingTokens
            ? {
                hasAccessToken: !!existingTokens.access_token,
                hasRefreshToken: !!existingTokens.refresh_token,
                tokenType: existingTokens.token_type,
                expiresIn: existingTokens.expires_in,
              }
            : "No tokens found",
        );

        const transport = new StreamableHTTPClientTransport(new URL(url), {
          authProvider: this.oauthProviders[serverName],
        });

        try {
          await client.connect(transport);
        } catch (err) {
          if (
            err instanceof Error &&
            err.message === "OAUTH_REQUIRED"
          ) {
            // 저장된 authUrl 또는 새로 캡처된 authUrl 사용
            const storedAuthUrl = await this.oauthProviders[serverName].getAuthUrl();
            const authUrlToUse = storedAuthUrl || capturedAuthUrl;
            
            if (authUrlToUse) {
              console.log(`Using ${storedAuthUrl ? 'stored' : 'captured'} OAuth URL for ${serverName}`);
              return {
                success: false,
                isPending: true,
                authUrl: authUrlToUse,
              };
            }
          }

          // HTTP MCP 서버의 경우 404 오류만 offline으로 처리, 나머지는 pending
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(
            "HTTP MCP Connection Error",
            `${serverName}: ${errorMessage}`,
          );

          // 404 오류인 경우 offline으로 처리
          if (
            errorMessage.includes("404") ||
            errorMessage.includes("Not Found")
          ) {
            return { success: false, error: errorMessage };
          }

          // 다른 HTTP 오류는 pending 상태로 처리 (OAuth 재시도 가능)
          return { success: false, isPending: true, error: errorMessage };
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Check Connection", `${serverName}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      await client.close();
    }

    return { success: true };
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

      const clientConfig: ClientConfig = {
        mcpServers: await this.findWorkingConnections(connections),
        throwOnLoadError: true,
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: "",
        useStandardContentBlocks: true,
      };

      this.client = new MultiServerMCPClient(clientConfig);

      // 연결 초기화 및 도구 로드
      await this.client.initializeConnections();
      this.tools = await this.client.getTools();

      this.isInitialized = true;
      console.log(
        `MCP client initialized with ${this.tools.length} tools from ${Object.keys(connections).length} servers`,
      );
    } catch (error) {
      console.log(`MCP client initialized with 0 tools`);
      console.error(error);
      this.isInitialized = true; // 실패해도 초기화 완료로 표시
      this.tools = [];
    }
  }

  async getTools(): Promise<StructuredToolInterface[]> {
    await this.initialize();
    return this.tools;
  }

  async getClient(): Promise<MultiServerMCPClient | null> {
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
    this.serverStatusCache = null; // 캐시 클리어
    // OAuth Provider는 토큰 정보를 유지하므로 삭제하지 않음

    await this.initialize();
    
    console.log(`MCPClientManager: Refresh complete, tools count: ${this.tools.length}`);
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.tools = [];
    this.isInitialized = false;
    this.initPromise = null;
    this.oauthProviders = {}; // OAuth Provider 정리
    this.serverUrls = {}; // 서버 URL 정리
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

      // 해당 서버의 OAuth Provider를 찾기 (없으면 생성)
      let oauthProvider = this.oauthProviders[serverName];
      if (!oauthProvider) {
        console.log(`OAuth provider not found for server: ${serverName}, creating new one`);
        oauthProvider = new FileSystemOAuthClientProvider(
          serverName,
          "http://localhost:3000/oauth/callback",
          {
            client_name: serverName,
            client_uri: "http://localhost:3000",
            redirect_uris: ["http://localhost:3000/oauth/callback"],
            response_types: ["code"],
            grant_types: ["authorization_code", "refresh_token"],
            scope: "profile email",
          },
          // onRedirect는 callback에서 사용되지 않으므로 빈 함수
          () => {},
        );
        this.oauthProviders[serverName] = oauthProvider;
      }

      // 해당 서버의 URL을 찾기 (없으면 설정에서 가져오기)
      let serverUrl = this.serverUrls[serverName];
      if (!serverUrl) {
        console.log(`Server URL not found in cache for server: ${serverName}, checking config`);
        const config = getServerConfig();
        const mcpServers = config.get("mcpServers") ?? {};
        const serverConfig = mcpServers[serverName];
        if (serverConfig && "url" in serverConfig) {
          serverUrl = serverConfig.url;
          this.serverUrls[serverName] = serverUrl; // 캐시에 저장
          console.log(`Found server URL in config: ${serverUrl}`);
        } else {
          console.error(`Server URL not found for server: ${serverName}`);
          return false;
        }
      }

      // 디버깅: OAuth Provider 상태 확인
      const codeVerifier = await oauthProvider.codeVerifier();
      const clientInfo = await oauthProvider.clientInformation();
      console.log(`OAuth debug for ${serverName}:`, {
        serverUrl,
        redirectUrl: oauthProvider.redirectUrl,
        codeVerifierLength: codeVerifier?.length ?? 0,
        hasClientInfo: !!clientInfo,
        clientId: clientInfo?.client_id?.substring(0, 10) + "...",
      });

      // 토큰 교환을 위한 세부 정보 수집
      console.log(
        `Attempting token exchange for ${serverName} with code: ${code.substring(0, 10)}...`,
      );

      try {
        // 직접 exchangeAuthorization을 호출하여 더 구체적인 오류 확인
        const codeVerifier = await oauthProvider.codeVerifier();
        const clientInfo = await oauthProvider.clientInformation();

        if (!clientInfo) {
          console.error(`No client information for server: ${serverName}`);
          return false;
        }

        console.log(`Token exchange details for ${serverName}:`, {
          authorizationCode: code.substring(0, 15) + "...",
          codeVerifier: codeVerifier.substring(0, 15) + "...",
          redirectUri: oauthProvider.redirectUrl,
          clientId: clientInfo?.client_id?.substring(0, 15) + "...",
          serverUrl,
        });

        // 원래 auth 함수 사용
        console.log(`Using original auth function for ${serverName}`);
        
        const authResult = await auth(oauthProvider, {
          serverUrl,
          authorizationCode: code,
          scope: "profile email"
        });

        if (authResult) {
          // auth 함수가 성공하면 토큰이 자동으로 provider에 저장됨
          const savedTokens = await oauthProvider.tokens();
          console.log(
            `OAuth authentication successful for server: ${serverName}`,
            savedTokens ? {
              tokenType: savedTokens.token_type,
              hasAccessToken: !!savedTokens.access_token,
              hasRefreshToken: !!savedTokens.refresh_token,
              expiresIn: savedTokens.expires_in,
            } : 'No tokens found after auth'
          );
          
          // OAuth 인증 성공 시 해당 서버의 캐시된 상태를 무효화
          if (this.serverStatusCache && this.serverStatusCache[serverName]) {
            delete this.serverStatusCache[serverName];
            console.log(`Cleared cached status for server: ${serverName}`);
          }
          
          // authUrl 클리어
          await oauthProvider.clearAuthUrl();
          
          return true;
        } else {
          console.error(
            `OAuth authentication failed for server: ${serverName}: No auth result`,
          );
          return false;
        }
      } catch (innerError) {
        // 더 구체적인 오류 정보 수집
        if (innerError instanceof Error) {
          console.error(`Detailed error for ${serverName}:`, {
            message: innerError.message,
            stack: innerError.stack?.split("\n").slice(0, 5),
          });
        }
        throw innerError;
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
    // 캐시가 있고 강제 새로고침이 아니면 캐시 반환
    if (this.serverStatusCache && !forceRefresh) {
      return this.serverStatusCache;
    }

    const statuses: Record<string, MCPServerConnectionStatus> = {};

    for (const [name, connection] of Object.entries(servers)) {
      statuses[name] = await this.checkWorking(name, connection);
    }

    // 캐시 저장
    this.serverStatusCache = statuses;

    return statuses;
  }
}

// 편의 함수
export function getMCPManager(): MCPClientManager {
  return MCPClientManager.getInstance();
}
