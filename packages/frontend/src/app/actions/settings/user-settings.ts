'use server';

import { loadSettings, saveSettingByPath } from '@/lib/config/settings';
import { UserSetting } from '@/types/settings.types';
import { PromptManager } from '@/app/actions/agent/prompt';
import { updateMCPConfig } from '@/app/actions/mcp/server';

export async function getUserSettings(): Promise<UserSetting> {
  const settings = await loadSettings();
  return settings.userSetting;
}

export async function updateUserSettings(userSetting: UserSetting): Promise<void> {
  await saveSettingByPath('userSetting', userSetting);
}

export async function updateCurrentAgent(agentName: string): Promise<void> {
  await saveSettingByPath('userSetting.currentAgent', agentName);
  
  // 에이전트 전환 시 PromptManager와 MCP 설정 업데이트
  await PromptManager.getInstance().updateAgent(agentName);
  await updateMCPConfig(agentName);
}