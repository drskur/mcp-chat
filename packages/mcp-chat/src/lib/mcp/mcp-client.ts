import type {DynamicStructuredTool} from "@langchain/core/tools";
import {type ClientConfig, type Connection, loadMcpTools} from "@langchain/mcp-adapters";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import {createOAuthProvider, type FileSystemOAuthClientProvider} from "@/lib/mcp/oauth";
import {MCPServerStatus, MCPToolStatus} from "@/types/mcp";

type OauthCallback = { authProvider: FileSystemOAuthClientProvider, serverUrl: string };

export class McpClient {
    private _transports: Record<string, Transport> = {};
    private _serverClients: Record<string, Client | null> = {};
    private _oauthCallback: Record<string, OauthCallback> = {};
    private readonly _config: ClientConfig;

    constructor(config: ClientConfig) {
        this._config = config;
    }

    createTransport(serverName: string, conn: Connection): Transport {
        if ("command" in conn) {
            const {command, args} = conn;
            return new StdioClientTransport({command, args});
        } else if ("url" in conn) {
            const {url} = conn;
            const authProvider = createOAuthProvider(serverName);
            this._oauthCallback[serverName] = {serverUrl: url, authProvider};
            return new StreamableHTTPClientTransport(new URL(url), {
                authProvider
            });
        } else {
            throw new Error("url or command must be set");
        }
    }

    async createClient(serverName: string, conn: Connection): Promise<Client | null> {
        const client = new Client({
            name: serverName,
            version: "1.0.0"
        });

        const transport = this.createTransport(serverName, conn);
        this._transports[serverName] = transport;
        try {
            await client.connect(transport);
            this._serverClients[serverName] = client;
            return client;
        } catch (err) {
            console.warn("MCP Client Connect Failed:", err);
            this._serverClients[serverName] = null;
            return null;
        }
    }

    async initializeConnections(): Promise<void> {
        // 기존 연결이 있다면 먼저 정리
        if (Object.keys(this._serverClients).length > 0 ||
            Object.keys(this._transports).length > 0) {
            await this.close();
        }

        const {mcpServers} = this._config;
        for (const [k, conn] of Object.entries(mcpServers)) {
            this._serverClients[k] = await this.createClient(k, conn);
        }
    }

    async getTools(): Promise<DynamicStructuredTool[]> {
        let tools: DynamicStructuredTool[] = [];
        for (const [k, client] of Object.entries(this._serverClients)) {
            if (client) {
                const tool = await loadMcpTools(k, client, {
                    prefixToolNameWithServerName: true,
                    additionalToolNamePrefix: "",
                    useStandardContentBlocks: true,
                });
                tools = tools.concat(tool);
            }
        }

        return tools;
    }

    getOauthCallback(serverName: string): OauthCallback {
        return this._oauthCallback[serverName];
    }

    async getConnectionStatus(): Promise<MCPServerStatus[]> {
        let output: MCPServerStatus[] = [];
        for (const [serverName, client] of Object.entries(this._serverClients)) {
            try {
                if (client) {
                    const listTools = await client.listTools();
                    const tools = listTools.tools.map(t => ({
                        name: t.name,
                        description: t.description
                    } as MCPToolStatus));
                    output.push({
                        name: serverName,
                        tools,
                        collapse: true,
                        connectionStatus: {
                            success: true
                        }
                    })
                } else {
                    const oauthCallback = this._oauthCallback[serverName];
                    if (oauthCallback) {
                        output.push({
                            name: serverName,
                            tools: [],
                            collapse: true,
                            connectionStatus: {
                                success: false,
                                isPending: true,
                            },
                        });
                    }
                }
            } catch (err: any) {
                const oauthCallback = this._oauthCallback[serverName];
                if (oauthCallback) {
                    output.push({
                        name: serverName,
                        tools: [],
                        collapse: true,
                        connectionStatus: {
                            success: false,
                            isPending: true,
                        },
                    })
                } else {
                    output.push({
                        name: serverName,
                        tools: [],
                        collapse: true,
                        connectionStatus: {
                            success: false,
                            error: err.toString()
                        },
                    });
                }
            }
        }

        return output;
    }

    async refreshConnections(): Promise<void> {
        await this.initializeConnections();
    }

    async close(): Promise<void> {
        for (const [_k, client] of Object.entries(this._serverClients)) {
            await client?.close();
        }
        for (const [_k, transport] of Object.entries(this._transports)) {
            await transport.close();
        }

        this._serverClients = {};
        this._transports = {};
    }
}