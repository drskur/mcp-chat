import { clientSettingDir } from './env';
import path from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { Settings } from '@/types/settings.types';

const settingFilePath = path.join(clientSettingDir, 'settings.json');

const initialSettings: Settings = {
  modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  mcp: {},
  prompt: {},
};

/**
 * 설정 파일이 존재하는지 확인하고, 없으면 초기값으로 생성합니다.
 */
export async function initSettingsFile(): Promise<void> {
  try {
    if (!existsSync(settingFilePath)) {
      console.log('설정 파일이 없습니다. 초기 설정 파일 생성 중...');
      await writeFile(
        settingFilePath,
        JSON.stringify(initialSettings, null, 2),
        'utf-8',
      );
      console.log('설정 파일 생성 완료:', settingFilePath);
    }
  } catch (error) {
    console.error('설정 파일 초기화 오류:', error);
    throw error;
  }
}

/**
 * 설정 파일을 로드합니다.
 * 파일이 없거나 오류가 발생하면 초기값을 반환합니다.
 */
export async function loadSettings(): Promise<Settings> {
  try {
    if (!existsSync(settingFilePath)) {
      console.log('설정 파일이 없습니다. 초기값을 반환합니다.');
      return initialSettings;
    }

    const data = await readFile(settingFilePath, 'utf-8');
    return JSON.parse(data) as Settings;
  } catch (error) {
    console.error('설정 파일 로드 오류:', error);
    console.log('초기값을 반환합니다.');
    return initialSettings;
  }
}

/**
 * 점으로 구분된 경로를 사용하여 객체의 특정 위치에 값을 설정합니다.
 * @param obj - 대상 객체
 * @param path - 점(.)으로 구분된 경로 (예: "aws.region")
 * @param value - 설정할 값
 * @returns 수정된 객체
 */
export function setValueByPath(obj: any, path: string, value: any): any {
  if (!path) {
    return value;
  }

  const keys = path.split('.');
  const result = JSON.parse(JSON.stringify(obj)); // 깊은 복사

  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (
      !current[key] ||
      typeof current[key] !== 'object' ||
      Array.isArray(current[key])
    ) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * 설정을 파일에 저장합니다.
 * @param settings - 저장할 설정 객체
 */
export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await writeFile(
      settingFilePath,
      JSON.stringify(settings, null, 2),
      'utf-8',
    );
    console.log('설정 파일 저장 완료');
  } catch (error) {
    console.error('설정 파일 저장 오류:', error);
    throw error;
  }
}

/**
 * 설정 파일의 특정 경로에 값을 저장합니다.
 * @param path - 점(.)으로 구분된 JSON 경로 (예: "aws.region")
 * @param value - 저장할 값
 */
export async function saveSettingByPath(
  path: string,
  value: any,
): Promise<void> {
  try {
    // 현재 설정 로드
    const currentSettings = await loadSettings();

    console.log('settings', currentSettings);

    // 경로를 사용하여 값 설정
    const updatedSettings = setValueByPath(currentSettings, path, value);

    // 파일에 저장
    await saveSettings(updatedSettings);

    console.log(`설정 저장 완료: ${path}`);
  } catch (error) {
    console.error('설정 저장 오류:', error);
    throw error;
  }
}