import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// 이미지 저장 디렉토리 설정
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'logos');

// 업로드 디렉토리 확인 및 생성 함수
async function ensureUploadDir() {
  try {
    // 베이스 업로드 디렉토리
    const baseUploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // 베이스 디렉토리 생성
    if (!existsSync(baseUploadDir)) {
      await mkdir(baseUploadDir, { recursive: true });
      console.log('베이스 업로드 디렉토리 생성됨:', baseUploadDir);
    }
    
    // 로고 전용 디렉토리 생성
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
      console.log('로고 업로드 디렉토리 생성됨:', UPLOAD_DIR);
    }
    
    return true;
  } catch (error) {
    console.error('업로드 디렉토리 생성 오류:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 업로드 디렉토리 확인 및 생성
    const dirCreated = await ensureUploadDir();
    if (!dirCreated) {
      return NextResponse.json(
        { error: '업로드 디렉토리를 생성할 수 없습니다.' },
        { status: 500 }
      );
    }

    // multipart/form-data 처리
    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json(
        { error: '로고 파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '이미지 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (1MB 제한)
    if (file.size > 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 1MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // 파일 이름 생성 (타임스탬프 + 원본 확장자)
    const timestamp = Date.now();
    const originalExtension = path.extname(file.name);
    const fileName = `logo_${timestamp}${originalExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // ArrayBuffer로 파일 읽기
    const buffer = await file.arrayBuffer();
    
    // 파일 저장
    await writeFile(filePath, Buffer.from(buffer));

    // 클라이언트에서 접근 가능한 URL 생성
    const logoUrl = `/uploads/logos/${fileName}`;

    console.log('로고 파일 업로드 성공:', fileName);

    return NextResponse.json({
      success: true,
      logoUrl,
      message: '로고가 성공적으로 업로드되었습니다.'
    });
    
  } catch (error) {
    console.error('로고 업로드 오류:', error);
    return NextResponse.json(
      { error: '로고 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 