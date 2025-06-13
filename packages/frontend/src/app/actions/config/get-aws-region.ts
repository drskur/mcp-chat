'use server';

import { DEFAULT_AWS_REGION } from '@/lib/config/env';

/**
 * 서버에서 AWS Region을 가져옵니다.
 * 클라이언트에서 환경변수에 직접 접근할 수 없으므로 서버 액션을 통해 가져옵니다.
 */
export async function getAwsRegion(): Promise<string> {
  return process.env.AWS_REGION || DEFAULT_AWS_REGION;
}