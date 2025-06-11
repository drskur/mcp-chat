import { useState, useRef, useCallback } from 'react';
import { autoFixJsonString } from '@/mcp/utils';

interface UseJsonEditorOptions {
  onError?: (error: string | null) => void;
  initialValue?: string;
}

export function useJsonEditor(options: UseJsonEditorOptions = {}) {
  const { onError, initialValue = '{}' } = options;

  const [jsonText, setJsonText] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 텍스트 업데이트만 수행
    setJsonText(e.target.value);
  }, []);

  const formatJSON = useCallback(() => {
    try {
      // 먼저 자동 수정 시도 (필요한 경우)
      const fixedJson = autoFixJsonString(jsonText);

      // 파싱해서 포맷팅
      const parsed = JSON.parse(fixedJson);
      // 예쁘게 포맷팅하여 다시 설정
      setJsonText(JSON.stringify(parsed, null, 2));
      onError?.(null);
    } catch (e) {
      // 파싱 오류가 있을 경우 에러 설정
      const errorMessage = e instanceof Error ? e.message : '구문 오류';
      onError?.(`JSON 형식 오류: ${errorMessage}`);
    }
  }, [jsonText, onError]);

  const parseJSON = useCallback(() => {
    try {
      // 먼저 자동 수정 시도
      const fixedJson = autoFixJsonString(jsonText);
      const parsed = JSON.parse(fixedJson);
      onError?.(null);
      return { success: true, data: parsed, fixedJson };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : '구문 오류';
      const error = `유효하지 않은 JSON 형식입니다: ${errorMessage}`;
      onError?.(error);
      return { success: false, error };
    }
  }, [jsonText, onError]);

  const validateJSON = useCallback(() => {
    try {
      JSON.parse(jsonText);
      return true;
    } catch {
      return false;
    }
  }, [jsonText]);

  const setJSONValue = useCallback((value: string | object) => {
    if (typeof value === 'string') {
      setJsonText(value);
    } else {
      setJsonText(JSON.stringify(value, null, 2));
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      return { success: true };
    } catch (err) {
      console.error('복사 실패:', err);
      return { success: false, error: '클립보드에 복사하지 못했습니다.' };
    }
  }, [jsonText]);

  return {
    // State
    jsonText,
    textareaRef,

    // Actions
    handleTextChange,
    formatJSON,
    parseJSON,
    validateJSON,
    setJSONValue,
    copyToClipboard,
  };
}