import { mkdir } from 'fs/promises';
import path from 'path';
import { clientSettingDir } from '@/lib/env';
import { initSettingsFile } from '@/lib/settings';

/**
 * 애플리케이션 업로드 디렉토리를 초기화합니다.
 * 서버 시작 시 한 번 실행하여 필요한 디렉토리가 존재하는지 확인합니다.
 */
async function initUploadDirectories() {
  const uploadBasePath = path.join(process.cwd(), 'public', 'uploads');
  const logosPath = path.join(uploadBasePath, 'logos');

  try {
    console.log('기본 업로드 디렉토리 생성 중...');
    await mkdir(uploadBasePath, { recursive: true });

    console.log('로고 업로드 디렉토리 생성 중...');
    await mkdir(logosPath, { recursive: true });

    return true;
  } catch (error) {
    console.error('업로드 디렉토리 초기화 오류:', error);
    return false;
  }
}

async function initConfigDirectory() {
  try {
    console.log('환경설정 디렉토리 생성 중...');
    await mkdir(clientSettingDir, { recursive: true });
  } catch (error) {
    console.error('환경설정 디렉토리 초기화 오류:', error);
    return false;
  }
}

export async function initDirs(): Promise<void> {
  await initUploadDirectories();
  await initConfigDirectory();
  await initSettingsFile();
}
