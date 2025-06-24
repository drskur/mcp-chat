import type {Connection} from "@langchain/mcp-adapters";
import Conf from "conf";
import {z} from "zod";
import {AnthropicModel} from "@/types/config";

const GeneralConfigSchema = z.object({
    language: z.enum(["ko", "en"]).default("ko"),
});

const MCPServerConfigSchema = z.object({
    servers: z.record(z.string(), z.any()).default({}),
});

const ModelConfigSchema = z.object({
    provider: z.enum(["bedrock", "amazon"]).default("bedrock"),
    model: z.object({
        modelId: z.string(),
        name: z.string()
    }),
    temperature: z.number().min(0).max(1).default(0.7),
    maxTokens: z.number().min(1).default(4096),
    region: z.string().default("us-east-1"),
    systemPrompt: z.string().default(""),
});

const ConfigSchema = z.object({
    general: GeneralConfigSchema,
    mcp: MCPServerConfigSchema,
    model: ModelConfigSchema,
});

export type Config = z.infer<typeof ConfigSchema>;
export type GeneralConfig = z.infer<typeof GeneralConfigSchema>;
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// Default configuration
const defaultConfig: Config = {
    general: {
        language: "ko",
    },
    mcp: {
        servers: {},
    },
    model: {
        provider: "bedrock",
        model: AnthropicModel.CLAUDE_3_5_HAIKU,
        temperature: 0.7,
        maxTokens: 4096,
        region: "us-east-1",
        systemPrompt: "당신은 도움이 되고 친절한 AI 어시스턴트입니다. 항상 정확하고 유용한 정보를 제공하려고 노력하며, 모르는 것은 솔직하게 인정합니다.",
    },
};

class ConfigManager {
    private conf: Conf<Config>;

    constructor() {
        this.conf = new Conf<Config>({
            projectName: "mcp-chat",
            defaults: defaultConfig,
            serialize: (value) => JSON.stringify(value, null, 2),
        });
    }

    // Get all configuration
    getAll(): Config {
        return this.conf.store;
    }

    // Get specific configuration section
    get<K extends keyof Config>(key: K): Config[K] {
        return this.conf.get(key);
    }

    // Set specific configuration section
    set<K extends keyof Config>(key: K, value: Config[K]): void {
        this.conf.set(key, value);
    }

    // Update configuration with partial values
    update(updates: Partial<Config>): void {
        const current = this.getAll();
        this.conf.store = {...current, ...updates};
    }

    // Reset configuration to defaults
    reset(): void {
        this.conf.clear();
    }

    // Get configuration file path
    getPath(): string {
        return this.conf.path;
    }

    // Watch for configuration changes
    onDidChange<K extends keyof Config>(
        key: K,
        callback: (newValue: Config[K] | undefined, oldValue: Config[K] | undefined) => void
    ): () => void {
        return this.conf.onDidChange(key, callback);
    }

    // Model-specific helpers
    // getActiveModel(): string {
    //     return this.get("model").defaultModel;
    // }
    //
    // setActiveModel(modelId: string): void {
    //     const modelConfig = this.get("model");
    //     this.set("model", {...modelConfig, defaultModel: modelId});
    // }
    //
    // // MCP server helpers - servers follow Connection interface
    // getMCPServers(): Record<string, Connection> {
    //     return this.get("mcp").servers as Record<string, Connection>;
    // }
    //
    // setMCPServers(servers: Record<string, Connection>): void {
    //     this.set("mcp", {servers});
    // }
    //
    // updateMCPServers(updates: Record<string, Connection>): void {
    //     const mcpConfig = this.get("mcp");
    //     const servers = {...mcpConfig.servers, ...updates};
    //     this.set("mcp", {servers});
    // }
}

// Export factory function for server-side usage
export function getServerConfig() {
    return new ConfigManager();
}