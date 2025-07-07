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
import { redirect } from "@solidjs/router";

export class MCPClientManager {
  private static instance: MCPClientManager;
  private client: MultiServerMCPClient | null = null;
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
  ): Promise<{ success: boolean; error?: string }> {
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
        const transport = new StreamableHTTPClientTransport(new URL(url), {
          authProvider: new FileSystemOAuthClientProvider(
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
            // onRedirect 콜백: SolidStart redirect 사용
            (url: URL) => {
              console.log("url-checking", url.toString());
              redirect(url.toString());
            },
          ),
        });

        await client.connect(transport);
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
    if (this.client) {
      await this.client.close();
    }

    this.client = null;
    this.tools = [];
    this.isInitialized = false;
    this.initPromise = null;

    await this.initialize();
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

  async getAllServerStatuses(
    servers: Record<string, Connection>,
  ): Promise<Record<string, { success: boolean; error?: string }>> {
    const statuses: Record<string, { success: boolean; error?: string }> = {};
    
    for (const [name, connection] of Object.entries(servers)) {
      statuses[name] = await this.checkWorking(name, connection);
    }
    
    return statuses;
  }
}

// 편의 함수
export function getMCPManager(): MCPClientManager {
  return MCPClientManager.getInstance();
}
