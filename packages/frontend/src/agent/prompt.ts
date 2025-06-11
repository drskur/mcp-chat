import { loadSystemPrompt } from '@/app/actions/prompt';

export class PromptManager {
  private static instance: PromptManager;
  private agentName: string | null = null;
  private prompt: string | null = null;

  static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  async updateAgent(agentName: string): Promise<void> {
    this.agentName = agentName;
    this.prompt = await loadSystemPrompt(agentName);
  }

  getPrompt(): string {
    if (!this.isInitialized()) {
      throw new Error('agent is not initialized. Call updateAgent first.');
    }

    return this.prompt!;
  }

  isInitialized(): boolean {
    return this.agentName !== null && this.prompt !== null;
  }
}
