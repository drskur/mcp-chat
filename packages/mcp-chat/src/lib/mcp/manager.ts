import type {StructuredToolInterface} from "@langchain/core/tools";
import {type ClientConfig, type Connection, MultiServerMCPClient } from "@langchain/mcp-adapters";
import {getServerConfig} from "@/lib/config";

export class MCPClientManager {
    private static instance: MCPClientManager;
    private client: MultiServerMCPClient | null = null;
    private tools: StructuredToolInterface[] = [];
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

            // 서버 설정이 없으면 초기화하지 않음
            if (!mcpServers || Object.keys(mcpServers).length === 0) {
                console.log("No MCP servers configured, skipping initialization");
                this.isInitialized = true;
                return;
            }

            // Connection 타입으로 변환
            const connections: Record<string, Connection> = {};
            for (const [name, serverConfig] of Object.entries(mcpServers)) {
                connections[name] = serverConfig as Connection;
            }

            const clientConfig: ClientConfig = {
                mcpServers: connections,
                throwOnLoadError: false,
                prefixToolNameWithServerName: true,
                additionalToolNamePrefix: "",
                useStandardContentBlocks: true,
            };

            this.client = new MultiServerMCPClient(clientConfig);

            // 연결 초기화 및 도구 로드
            await this.client.initializeConnections();
            this.tools = await this.client.getTools();

            this.isInitialized = true;
            console.log(`MCP client initialized with ${this.tools.length} tools from ${Object.keys(connections).length} servers`);
        } catch (_error) {
            console.log(`MCP client initialized with 0 tools`);
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

    getToolCount(): number {
        return this.tools.length;
    }
}

// 편의 함수
export function getMCPManager(): MCPClientManager {
    return MCPClientManager.getInstance();
}