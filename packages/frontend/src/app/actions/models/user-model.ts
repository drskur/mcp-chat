'use server';

import {
  loadSettings,
  saveSettingByPath,
} from '@/lib/settings';

export async function getUserModel(): Promise<{ modelId: string }> {
  try {
    // 설정 로드
    const settings = await loadSettings();
    const modelId = settings.modelId;

    console.log(`사용자 모델 로드됨: ${modelId}`);
    return { modelId };
  } catch (error) {
    console.error('사용자 모델 정보 로드 실패:', error);
    // 오류 발생시 하드코딩된 기본값 반환
    return { modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0' };
  }
}

export async function saveUserModel(
  modelId: string,
): Promise<{ success: boolean; modelId: string }> {
  try {
    // defaultModelId 업데이트
    await saveSettingByPath('modelId', modelId);

    console.log(`사용자 모델 저장됨: ${modelId}`);
    return { success: true, modelId };
  } catch (error) {
    console.error('사용자 모델 저장 실패:', error);
    return { success: false, modelId };
  }
}
