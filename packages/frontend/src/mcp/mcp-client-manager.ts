import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { loadMcpConfig } from '@/mcp/config';
import { loadSettings } from '@/lib/config/settings';

export class MCPClientManager {
  private static instance: MCPClientManager;
  private mcpClient: MultiServerMCPClient | null = null;
  private currentConfigName: string | null = null;
  private configCache: any = {};

  private constructor() {}

  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  async getClient(): Promise<MultiServerMCPClient | null> {
    if (!this.currentConfigName) {
      // 초기화되지 않았으면 현재 에이전트 설정을 가져옴
      const settings = await loadSettings();
      this.currentConfigName = settings.userSetting.currentAgent;
    }

    if (!this.isInitialized()) {
      await this.updateConfig(this.currentConfigName);
    }
    return this.mcpClient;
  }

  async updateConfig(configName: string, forceUpdate: boolean = false): Promise<boolean> {
    const newConfig = await loadMcpConfig(configName);

    // 클라이언트가 없거나 설정이 변경되었는지 확인
    const needsUpdate =
      forceUpdate ||
      this.currentConfigName !== configName ||
      JSON.stringify(this.configCache) !== JSON.stringify(newConfig);

    // 변경사항이 없으면 바로 반환
    if (!needsUpdate) {
      return false;
    }

    console.log(`Updating MCP client config for agent: ${configName}`, {
      forceUpdate,
      configChanged: this.currentConfigName !== configName,
      configDiff: JSON.stringify(this.configCache) !== JSON.stringify(newConfig)
    });

    // 기존 클라이언트 정리
    this.mcpClient = null;

    // MCP 서버가 없으면 클라이언트를 null로 설정
    if (
      !newConfig.mcpServers ||
      Object.keys(newConfig.mcpServers).length === 0
    ) {
      this.currentConfigName = configName;
      this.configCache = newConfig;
      return true; // 빈 설정으로 업데이트됨
    }

    // 클라이언트 생성 또는 재생성
    this.mcpClient = new MultiServerMCPClient(newConfig);
    this.currentConfigName = configName;
    this.configCache = newConfig;
    return true; // 생성 또는 업데이트됨
  }

  isInitialized(): boolean {
    return this.mcpClient !== null;
  }
}
