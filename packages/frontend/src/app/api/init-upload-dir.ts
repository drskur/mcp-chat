import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * 애플리케이션 업로드 디렉토리를 초기화합니다.
 * 서버 시작 시 한 번 실행하여 필요한 디렉토리가 존재하는지 확인합니다.
 */
export async function initUploadDirectories() {
  const uploadBasePath = path.join(process.cwd(), 'public', 'uploads');
  const logosPath = path.join(uploadBasePath, 'logos');
  
  try {
    // 기본 업로드 디렉토리 생성
    if (!existsSync(uploadBasePath)) {
      console.log('기본 업로드 디렉토리 생성 중...');
      await mkdir(uploadBasePath, { recursive: true });
    }
    
    // 로고 업로드 디렉토리 생성
    if (!existsSync(logosPath)) {
      console.log('로고 업로드 디렉토리 생성 중...');
      await mkdir(logosPath, { recursive: true });
    }
    
    console.log('업로드 디렉토리 초기화 완료');
    return true;
  } catch (error) {
    console.error('업로드 디렉토리 초기화 오류:', error);
    return false;
  }
} 