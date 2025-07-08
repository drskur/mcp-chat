import {
  type ClientConfig,
  type Connection,
  MultiServerMCPClient,
} from "@langchain/mcp-adapters";
import type { StructuredToolInterface } from "@langchain/core/tools";
import {
  createOAuthProvider,
  type FileSystemOAuthClientProvider,
} from "@/lib/mcp/oauth";
import type { MCPServerConnectionStatus } from "@/types/mcp";

/**
 * 개별 서버 오류에도 불구하고 다른 서버들을 정상적으로 사용할 수 있도록 하는
 * 복원력 있는 MCP 클라이언트
 */
export class ResilientMultiServerMCPClient {
  private serverClients: Record<string, MultiServerMCPClient> = {};
  private config: ClientConfig;
  private serverStatuses: Record<string, MCPServerConnectionStatus> = {};
  private oauthProviders: Record<string, FileSystemOAuthClientProvider> = {};
  private serverUrls: Record<string, string> = {};

  constructor(config: ClientConfig) {
    this.config = config;
  }

  /**
   * MCP 서버 연결 상태 확인 (기존 서버 클라이언트 상태 기반)
   */
  async checkWorking(
    serverName: string,
    connection: Connection,
  ): Promise<MCPServerConnectionStatus> {
    // 이미 성공적으로 초기화된 서버라면 성공 상태 반환
    if (this.serverClients[serverName]) {
      return { success: true };
    }

    // 캐시된 상태가 있으면 반환
    if (this.serverStatuses[serverName]) {
      return this.serverStatuses[serverName];
    }

    // OAuth 서버의 경우 토큰 사전 확인
    if ("url" in connection) {
      const provider = this.oauthProviders[serverName];
      if (provider) {
        const existingTokens = await provider.tokens();
        if (existingTokens?.access_token) {
          // 토큰이 있으면 성공으로 간주 (실제 연결 테스트 생략)
          console.log(`Valid OAuth tokens found for server: ${serverName}, skipping connection test`);
          const status = { success: true };
          this.serverStatuses[serverName] = status;
          return status;
        }
      }
    }

    // 새로운 연결 시도 (OAuth 설정 포함)
    const preparedConnection = this.prepareConnectionWithOAuth(
      serverName,
      connection,
    );

    try {
      const testClient = this.createSingleServerClient(serverName, preparedConnection);

      await testClient.initializeConnections();
      await testClient.getTools();

      // 테스트 성공 후 정리
      await testClient.close();

      const status = { success: true };
      this.serverStatuses[serverName] = status;
      return status;
    } catch (error) {
      let status: MCPServerConnectionStatus;

      if (error instanceof Error) {
        if (this.isOAuthError(error)) {
          const result = await this.handleOAuthError(
            serverName,
            connection,
            "check",
          );
          status = result.status;
        } else {
          status = this.handleNonOAuthError(error);
        }
      } else {
        status = {
          success: false,
          error: String(error),
        };
      }

      this.serverStatuses[serverName] = status;
      return status;
    }
  }

  /**
   * OAuth Provider 설정이 필요한 연결인지 확인하고 설정
   */
  private prepareConnectionWithOAuth(
    serverName: string,
    connection: Connection,
  ): Connection {
    if ("url" in connection) {
      const { url } = connection;

      // 서버 URL 저장
      this.serverUrls[serverName] = url;

      // OAuth Provider 인스턴스 생성 또는 재사용
      if (!this.oauthProviders[serverName]) {
        this.oauthProviders[serverName] = createOAuthProvider(serverName);
      }

      // OAuth Provider를 connection에 추가
      return {
        ...connection,
        authProvider: this.oauthProviders[serverName],
      };
    }

    return connection;
  }

  /**
   * OAuth 에러인지 확인
   */
  private isOAuthError(error: Error): boolean {
    return (
      error.message === "OAUTH_REQUIRED" ||
      error.message.includes("OAuth") ||
      error.message.includes("401") ||
      error.message.toLowerCase().includes("unauthorized") ||
      error.message.toLowerCase().includes("authentication")
    );
  }

  /**
   * 인증 URL 생성
   */
  private async getAuthUrlForServer(
    serverName: string,
  ): Promise<string | undefined> {
    const provider = this.oauthProviders[serverName];
    if (!provider) {
      return undefined;
    }

    let authUrl = await provider.getAuthUrl();

    // authUrl이 없으면 redirectUrl 사용
    if (!authUrl) {
      authUrl = provider.redirectUrl as string;
    }

    return authUrl;
  }

  /**
   * 저장된 토큰으로 서버 연결 재시도
   */
  private async retryConnectionWithTokens(
    serverName: string,
    connection: Connection,
  ): Promise<{
    success: boolean;
    client?: MultiServerMCPClient;
    tools?: StructuredToolInterface[];
  }> {
    try {
      const retryConnection = this.prepareConnectionWithOAuth(
        serverName,
        connection,
      );

      const retryClient = this.createSingleServerClient(serverName, retryConnection);
      await retryClient.initializeConnections();
      const retryTools = await retryClient.getTools();

      return { success: true, client: retryClient, tools: retryTools };
    } catch (retryError) {
      console.warn(
        `Server ${serverName} failed to connect even with tokens:`,
        retryError,
      );
      return { success: false };
    }
  }

  /**
   * 단일 서버 클라이언트 생성
   */
  private createSingleServerClient(
    serverName: string, 
    connection: Connection
  ): MultiServerMCPClient {
    const singleServerConfig: ClientConfig = {
      ...this.config,
      mcpServers: {
        [serverName]: connection,
      },
    };
    return new MultiServerMCPClient(singleServerConfig);
  }

  /**
   * 에러 처리 결과를 반환하는 공통 인터페이스
   */
  private handleNonOAuthError(error: Error): MCPServerConnectionStatus {
    if (
      error.message.includes("404") ||
      error.message.includes("Not Found")
    ) {
      return {
        success: false,
        error: error.message,
      };
    } else {
      return {
        success: false,
        isPending: true,
        error: error.message,
      };
    }
  }

  /**
   * OAuth 에러 처리 로직
   */
  private async handleOAuthError(
    serverName: string,
    connection: Connection,
    context: "check" | "init" | "restart",
  ): Promise<{
    status: MCPServerConnectionStatus;
    success: boolean;
    client?: MultiServerMCPClient;
    tools?: StructuredToolInterface[];
  }> {
    console.log(
      `OAuth error detected for ${serverName}, checking for existing tokens`,
    );

    const provider = this.oauthProviders[serverName];
    if (!provider) {
      const authUrl = await this.getAuthUrlForServer(serverName);
      return {
        status: {
          success: false,
          isPending: true,
          authUrl: authUrl,
        },
        success: false,
      };
    }

    const existingTokens = await provider.tokens();

    if (existingTokens?.access_token) {
      console.log(
        `Valid OAuth tokens found for server: ${serverName}, retrying connection`,
      );

      const retryResult = await this.retryConnectionWithTokens(
        serverName,
        connection,
      );

      if (retryResult.success) {
        console.log(
          `Server ${serverName} successfully connected with existing tokens`,
        );
        return {
          status: { success: true },
          success: true,
          client: retryResult.client,
          tools: retryResult.tools,
        };
      } else {
        // 토큰이 있어도 연결 실패하면 토큰 문제일 수 있으므로 재인증 필요
        const authUrl = await this.getAuthUrlForServer(serverName);
        return {
          status: {
            success: false,
            isPending: true,
            authUrl: authUrl,
          },
          success: false,
        };
      }
    } else {
      // 토큰이 없으면 인증 필요 상태
      const authUrl = await this.getAuthUrlForServer(serverName);
      return {
        status: {
          success: false,
          isPending: true,
          authUrl: authUrl,
        },
        success: false,
      };
    }
  }

  /**
   * 연결 초기화를 개별 서버별로 수행하여 일부 서버 오류가 전체에 영향을 주지 않도록 함
   */
  async initializeConnections(): Promise<
    Record<string, StructuredToolInterface[]>
  > {
    const serverNames = Object.keys(this.config.mcpServers);
    const results: Record<string, StructuredToolInterface[]> = {};

    // 각 서버를 개별적으로 초기화
    for (const serverName of serverNames) {
      let connection: Connection = this.config.mcpServers[serverName];

      try {
        console.log(`Initializing MCP server: ${serverName}`);

        // OAuth 설정이 필요한 경우 준비
        connection = this.prepareConnectionWithOAuth(serverName, connection);

        // 개별 서버 클라이언트 생성
        const serverClient = this.createSingleServerClient(serverName, connection);

        // 연결 초기화 시도
        await serverClient.initializeConnections();
        const tools = await serverClient.getTools();

        // 성공한 경우 클라이언트 저장
        this.serverClients[serverName] = serverClient;
        results[serverName] = tools;
        this.serverStatuses[serverName] = { success: true };

        console.log(
          `Successfully initialized server ${serverName} with ${tools.length} tools`,
        );
      } catch (error) {
        console.error(`Failed to initialize server ${serverName}:`, error);

        // OAuth 인증이 필요한 경우 특별 처리
        if (error instanceof Error) {
          if (this.isOAuthError(error)) {
            const result = await this.handleOAuthError(
              serverName,
              connection,
              "init",
            );
            this.serverStatuses[serverName] = result.status;

            if (result.success && result.client && result.tools) {
              // 성공한 경우 클라이언트 저장
              this.serverClients[serverName] = result.client;
              results[serverName] = result.tools;
            } else {
              console.log(
                `Server ${serverName} requires OAuth authentication: ${result.status.authUrl}`,
              );
            }
          } else {
            this.serverStatuses[serverName] = this.handleNonOAuthError(error);
          }
        } else {
          this.serverStatuses[serverName] = {
            success: false,
            error: String(error),
          };
        }

        results[serverName] = [];
      }
    }

    return results;
  }

  /**
   * 모든 서버에서 사용 가능한 도구들을 반환
   */
  async getTools(): Promise<StructuredToolInterface[]> {
    const allTools: StructuredToolInterface[] = [];

    for (const [serverName, client] of Object.entries(this.serverClients)) {
      try {
        const tools = await client.getTools();
        allTools.push(...tools);
        console.log(`Got ${tools.length} tools from server: ${serverName}`);
      } catch (error) {
        console.error(`Failed to get tools from server ${serverName}:`, error);
        // 개별 서버 오류는 전체에 영향을 주지 않음
      }
    }

    return allTools;
  }

  /**
   * 클라이언트 종료
   */
  async close(): Promise<void> {
    // 모든 서버 클라이언트 종료
    for (const [serverName, client] of Object.entries(this.serverClients)) {
      try {
        await client.close();
        console.log(`Closed client for server: ${serverName}`);
      } catch (error) {
        console.error(
          `Failed to close client for server ${serverName}:`,
          error,
        );
      }
    }

    // 모든 클라이언트 정리
    this.serverClients = {};
  }

  /**
   * 특정 서버의 클라이언트 반환
   */
  getServerClient(serverName: string): MultiServerMCPClient | undefined {
    return this.serverClients[serverName];
  }

  /**
   * 모든 서버 클라이언트 반환
   */
  getAllServerClients(): Record<string, MultiServerMCPClient> {
    return { ...this.serverClients };
  }

  /**
   * 서버별 연결 상태 반환
   */
  getServerStatuses(): Record<string, MCPServerConnectionStatus> {
    return { ...this.serverStatuses };
  }

  /**
   * OAuth Provider 반환
   */
  getOAuthProvider(
    serverName: string,
  ): FileSystemOAuthClientProvider | undefined {
    return this.oauthProviders[serverName];
  }

  /**
   * 서버 URL 반환
   */
  getServerUrl(serverName: string): string | undefined {
    return this.serverUrls[serverName];
  }

  /**
   * OAuth Provider 설정
   */
  setOAuthProvider(
    serverName: string,
    provider: FileSystemOAuthClientProvider,
  ): void {
    this.oauthProviders[serverName] = provider;
  }

  /**
   * 서버 URL 설정
   */
  setServerUrl(serverName: string, url: string): void {
    this.serverUrls[serverName] = url;
  }

  /**
   * OAuth Provider 정리
   */
  clearOAuthProviders(): void {
    this.oauthProviders = {};
  }

  /**
   * 서버 URL 정리
   */
  clearServerUrls(): void {
    this.serverUrls = {};
  }

  /**
   * 특정 서버 재시작
   */
  async restartServer(serverName: string): Promise<boolean> {
    // 연결 정보 가져오기
    const connection = this.config.mcpServers[serverName];
    if (!connection) {
      console.error(`No configuration found for server: ${serverName}`);
      return false;
    }

    try {
      // 기존 클라이언트 종료
      if (this.serverClients[serverName]) {
        await this.serverClients[serverName].close();
        delete this.serverClients[serverName];
      }

      // 상태 초기화
      delete this.serverStatuses[serverName];

      // OAuth 설정 포함한 연결 준비
      const preparedConnection = this.prepareConnectionWithOAuth(
        serverName,
        connection,
      );

      // 새 클라이언트 생성 및 초기화
      const serverClient = this.createSingleServerClient(serverName, preparedConnection);
      await serverClient.initializeConnections();
      await serverClient.getTools();

      // 성공한 경우 저장
      this.serverClients[serverName] = serverClient;
      this.serverStatuses[serverName] = { success: true };

      console.log(`Successfully restarted server: ${serverName}`);
      return true;
    } catch (error) {
      console.error(`Failed to restart server ${serverName}:`, error);

      // 에러 상태 저장
      if (error instanceof Error) {
        if (this.isOAuthError(error)) {
          const result = await this.handleOAuthError(
            serverName,
            connection,
            "restart",
          );
          this.serverStatuses[serverName] = result.status;

          if (result.success && result.client) {
            // 성공한 경우 저장
            this.serverClients[serverName] = result.client;
            console.log(
              `Server ${serverName} successfully restarted with existing tokens`,
            );
            return true;
          }
        } else {
          this.serverStatuses[serverName] = this.handleNonOAuthError(error);
        }
      }

      return false;
    }
  }

  /**
   * 특정 서버 제거
   */
  async removeServer(serverName: string): Promise<void> {
    if (this.serverClients[serverName]) {
      await this.serverClients[serverName].close();
      delete this.serverClients[serverName];
    }

    delete this.serverStatuses[serverName];
    delete this.oauthProviders[serverName];
    delete this.serverUrls[serverName];

    console.log(`Removed server: ${serverName}`);
  }
}
