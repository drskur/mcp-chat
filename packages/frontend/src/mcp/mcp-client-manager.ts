import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { loadMcpConfig } from '@/mcp/config';

export class MCPClientManager {
  private static instance: MCPClientManager;
  private mcpClient: MultiServerMCPClient | null = null;
  private currentConfigName: string = 'default';
  private configCache: any = {};

  private constructor() {}

  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  async getClient(): Promise<MultiServerMCPClient | null> {
    return this.mcpClient;
  }

  async updateConfig(configName: string = 'default'): Promise<boolean> {
    const newConfig = await loadMcpConfig(configName);

    // 클라이언트가 없거나 설정이 변경되었는지 확인
    const needsUpdate =
      this.currentConfigName !== configName ||
      JSON.stringify(this.configCache) !== JSON.stringify(newConfig);

    console.log("needsUpdate", needsUpdate);

    if (needsUpdate) {
      // 클라이언트 생성 또는 재생성
      console.log(newConfig);
      this.mcpClient = new MultiServerMCPClient(newConfig);
      this.currentConfigName = configName;
      this.configCache = newConfig;
      return true; // 생성 또는 업데이트됨
    }

    return false; // 변경사항 없음
  }

  async resetClient(): Promise<void> {
    this.mcpClient = null;
    this.configCache = {};
    this.currentConfigName = 'default';
  }

  getCurrentConfigName(): string {
    return this.currentConfigName;
  }

  isInitialized(): boolean {
    return this.mcpClient !== null;
  }
}
