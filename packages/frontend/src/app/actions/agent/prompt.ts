'use server';

import { loadSystemPrompt } from '@/app/actions/prompt';
import { loadSettings } from '@/lib/config/settings';

class PromptManager {
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

  async getPrompt(): Promise<string> {
    if (!this.isInitialized()) {
      const settings = await loadSettings();
      const agentName = settings.userSetting.currentAgent;
      await this.updateAgent(agentName);
    }

    return this.prompt!;
  }

  isInitialized(): boolean {
    return this.agentName !== null && this.prompt !== null;
  }
}

export async function updateAgentPrompt(agentName: string): Promise<void> {
  await PromptManager.getInstance().updateAgent(agentName);
}

export async function getAgentPrompt(): Promise<string> {
  return PromptManager.getInstance().getPrompt();
}

export async function isPromptInitialized(): Promise<boolean> {
  return PromptManager.getInstance().isInitialized();
}

export async function initializePromptManager(agentName: string) {
  try {
    const manager = PromptManager.getInstance();
    await manager.updateAgent(agentName);

    const prompt = await manager.getPrompt();

    return {
      success: true,
      agent: agentName,
      initialized: manager.isInitialized(),
      prompt: prompt ? prompt.slice(0, 100) + '...' : null,
    };
  } catch (error) {
    console.error('Failed to initialize PromptManager:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getSystemPrompt() {
  try {
    const manager = PromptManager.getInstance();
    const prompt = await manager.getPrompt();

    return {
      success: true,
      prompt,
    };
  } catch (error) {
    console.error('Failed to get system prompt:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updatePromptAgent(agentName: string) {
  try {
    const manager = PromptManager.getInstance();
    await manager.updateAgent(agentName);

    return {
      success: true,
      agent: agentName,
    };
  } catch (error) {
    console.error('Failed to update prompt agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export { PromptManager };