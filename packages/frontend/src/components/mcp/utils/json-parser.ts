import { ServerConfig } from '@/types/mcp';

export const autoFixJsonString = (jsonStr: string): string => {
  if (!jsonStr.trim()) return '';

  try {
    // 이미 유효한 JSON인지 확인
    JSON.parse(jsonStr);
    return jsonStr; // 이미 유효하면 그대로 반환
  } catch (e) {
    // 처리할 문자열 준비
    let processedStr = jsonStr.trim();

    // 1. "key": { ... } 형태 감지 (객체 속성 형태)
    if (processedStr.match(/^"[^"]+"\s*:\s*\{/)) {
      // 전체를 중괄호로 감싸서 유효한 JSON 객체로 만듦
      processedStr = `{${processedStr}}`;

      try {
        // 유효성 검사
        JSON.parse(processedStr);
        return processedStr;
      } catch (innerError) {
        // 계속 진행
      }
    }

    // 2. 처음이나 끝에 있을 수 있는 여분의 쉼표 제거
    processedStr = processedStr.replace(/,\s*}/g, '}');
    processedStr = processedStr.replace(/,\s*]/g, ']');

    // 3. 누락된 따옴표 수정 시도 (간단한 경우만)
    // 속성 이름에 따옴표가 없는 경우 (예: {key: "value"})
    processedStr = processedStr.replace(/\{([^{}:"']+):/g, '{"$1":');
    processedStr = processedStr.replace(/,\s*([^{}:"']+):/g, ',"$1":');

    try {
      // 최종 유효성 검사
      JSON.parse(processedStr);
      return processedStr;
    } catch (finalError) {
      // 실패한 경우 원본 반환
      return jsonStr;
    }
  }
};

export const tryParseConfig = (
  jsonString: string,
  setError: (error: string) => void
): { mcpServers: Record<string, ServerConfig> } | null => {
  try {
    // 자동 수정된 JSON 문자열 얻기
    const fixedJsonString = autoFixJsonString(jsonString);

    // JSON 파싱 시도
    const config = JSON.parse(fixedJsonString);

    // mcpServers 객체로 직접 변환 (구조 없이 직접 서버 설정을 입력한 경우)
    return { mcpServers: config };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : '구문 오류';
    setError(`유효하지 않은 JSON 형식입니다: ${errorMessage}`);
    return null;
  }
};