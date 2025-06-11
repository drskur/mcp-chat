// 환경변수 타입 정의 및 검증

import path from 'path';
import os from 'os';

export const DEFAULT_AWS_REGION = 'us-east-1';

export const env = {
  // 서버 사이드 환경변수
  API_URL: process.env.API_URL || 'http://localhost:8000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MCP_CLIENT_SETTINGS_DIR: process.env.MCP_CLIENT_SETTINGS_DIR || '.pace-mcp-client',

  // 클라이언트 사이드 환경변수 (NEXT_PUBLIC_ 접두사 필요)
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',

  AWS_REGION: process.env.AWS_REGION || DEFAULT_AWS_REGION,
} as const;

// 환경변수 검증 함수
export function validateEnv() {
  const required = ['MCP_CLIENT_SETTINGS_DIR'];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`환경변수 ${key}가 설정되지 않았습니다.`);
    }
  }
}

// 개발 환경 여부 확인
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';

export const clientSettingDir = path.join(os.homedir(), env.MCP_CLIENT_SETTINGS_DIR);