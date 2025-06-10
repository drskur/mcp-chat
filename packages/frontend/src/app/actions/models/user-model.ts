'use server';

import {
  loadSettings,
  saveSettingByPath,
} from '@/lib/settings';

const DEFAULT_MODEL_ID = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

export async function getUserModel(name: string): Promise<{ modelId: string }> {
  try {
    // 설정 로드
    const settings = await loadSettings();
    const modelId = settings.agents?.[name]?.model ?? DEFAULT_MODEL_ID;

    console.log(`사용자 모델 로드됨 (${name}): ${modelId}`);
    return { modelId };
  } catch (error) {
    console.error('사용자 모델 정보 로드 실패:', error);
    // 오류 발생시 기본값 반환
    return { modelId: DEFAULT_MODEL_ID };
  }
}

export async function saveUserModel(
  name: string,
  modelId: string,
): Promise<{ success: boolean; modelId: string }> {
  try {
    // agent name별로 모델 저장
    await saveSettingByPath(`agents.${name}.model`, modelId);

    console.log(`사용자 모델 저장됨 (${name}): ${modelId}`);
    return { success: true, modelId };
  } catch (error) {
    console.error('사용자 모델 저장 실패:', error);
    return { success: false, modelId };
  }
}
