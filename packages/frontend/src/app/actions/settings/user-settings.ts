'use server';

import { loadSettings, saveSettingByPath } from '@/lib/config/settings';
import { UserSetting } from '@/types/settings.types';

export async function getUserSettings(): Promise<UserSetting> {
  const settings = await loadSettings();
  return settings.userSetting;
}

export async function updateUserSettings(userSetting: UserSetting): Promise<void> {
  await saveSettingByPath('userSetting', userSetting);
}

export async function updateCurrentAgent(agentName: string): Promise<void> {
  await saveSettingByPath('userSetting.currentAgent', agentName);
}