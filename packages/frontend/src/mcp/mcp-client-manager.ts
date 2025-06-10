import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { loadMcpConfig } from '@/mcp/config';
import { DEFAULT_AGENT_NAME } from '@/types/settings.types';

export class MCPClientManager {
  private static instance: MCPClientManager;
  private mcpClient: MultiServerMCPClient | null = null;
  private currentConfigName: string = DEFAULT_AGENT_NAME;
  private configCache: any = {};

  private constructor() {}

  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  async getClient(): Promise<MultiServerMCPClient | null> {
    if (!this.isInitialized()) {
      await this.updateConfig(this.currentConfigName);
    }
    return this.mcpClient;
  }

  async updateConfig(configName: string = DEFAULT_AGENT_NAME): Promise<boolean> {
    const newConfig = await loadMcpConfig(configName);

    // MCP 서버가 없으면 클라이언트를 null로 설정
    if (!newConfig.mcpServers || Object.keys(newConfig.mcpServers).length === 0) {
      this.mcpClient = null;
      this.currentConfigName = configName;
      this.configCache = newConfig;
      return false;
    }

    // 클라이언트가 없거나 설정이 변경되었는지 확인
    const needsUpdate =
      this.currentConfigName !== configName ||
      JSON.stringify(this.configCache) !== JSON.stringify(newConfig);

    if (needsUpdate) {
      // 클라이언트 생성 또는 재생성
      this.mcpClient = new MultiServerMCPClient(newConfig);
      this.currentConfigName = configName;
      this.configCache = newConfig;
      return true; // 생성 또는 업데이트됨
    }

    return false; // 변경사항 없음
  }

  isInitialized(): boolean {
    return this.mcpClient !== null;
  }
}
