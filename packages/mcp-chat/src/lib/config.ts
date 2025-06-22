import Conf from "conf";
import {z} from "zod";

// Configuration schema definitions
const GeneralConfigSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  language: z.enum(["ko", "en"]).default("ko"),
});

const MCPServerConfigSchema = z.object({
  servers: z.record(z.string(), z.any()).default({}), // 유저가 입력한 JSON을 그대로 저장
});

const ModelConfigSchema = z.object({
  provider: z.enum(["bedrock", "amazon"]).default("bedrock"),
  defaultModel: z.string().default("us.anthropic.claude-3-5-haiku-20241022-v1:0"),
  temperature: z.number().min(0).max(1).default(0.7),
  maxTokens: z.number().min(1).default(4096),
  region: z.string().default("us-east-1"),
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
    theme: "system",
    language: "ko",
  },
  mcp: {
    servers: {},
  },
  model: {
    provider: "bedrock",
    defaultModel: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    temperature: 0.7,
    maxTokens: 4096,
    region: "us-east-1",
  },
};

class ConfigManager {
  private conf: Conf<Config>;

  constructor() {
    this.conf = new Conf<Config>({
      projectName: "mcp-chat",
      defaults: defaultConfig,
      schema: ConfigSchema as any,
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
  getActiveModel(): string {
    return this.get("model").defaultModel;
  }

  setActiveModel(modelId: string): void {
    const modelConfig = this.get("model");
    this.set("model", { ...modelConfig, defaultModel: modelId });
  }

  // MCP server helpers - servers is now a record (object)
  getMCPServers() {
    return this.get("mcp").servers;
  }

  setMCPServers(servers: Record<string, any>): void {
    this.set("mcp", { servers });
  }

  updateMCPServers(updates: Record<string, any>): void {
    const mcpConfig = this.get("mcp");
    const servers = { ...mcpConfig.servers, ...updates };
    this.set("mcp", { servers });
  }

  // Theme helpers
  getTheme() {
    return this.get("general").theme;
  }

  setTheme(theme: GeneralConfig["theme"]): void {
    const generalConfig = this.get("general");
    this.set("general", { ...generalConfig, theme });
  }
}

// Only export factory function for server-side usage
export function getServerConfig() {
  return new ConfigManager();
}