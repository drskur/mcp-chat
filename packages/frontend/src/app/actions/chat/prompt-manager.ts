'use server';

import { PromptManager } from '@/agent/prompt';

export async function initializePromptManager(agentName: string) {
  try {
    const manager = PromptManager.getInstance();
    await manager.updateAgent(agentName);
    
    const prompt = manager.getPrompt();

    return {
      success: true,
      agent: agentName,
      initialized: manager.isInitialized(),
      prompt: prompt ? prompt.slice(0, 100) + '...' : null, // 처음 100자만 반환
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
    const prompt = manager.getPrompt();

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