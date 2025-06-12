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
      const fixedJson = autoFixJsonString(jsonText);
      const formatted = JSON.stringify(JSON.parse(fixedJson), null, 2);
      setJsonText(formatted);
      onError?.(null);
      return { success: true, formatted };
    } catch (err) {
      const errorMessage = 'JSON 포맷 중 오류가 발생했습니다.';
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [jsonText, onError]);

  const validateJSON = useCallback(() => {
    try {
      JSON.parse(jsonText);
      onError?.(null);
      return { valid: true };
    } catch (err) {
      const errorMessage = 'JSON 형식이 올바르지 않습니다.';
      onError?.(errorMessage);
      return { valid: false, error: errorMessage };
    }
  }, [jsonText, onError]);

  const clearContent = useCallback(() => {
    setJsonText('{}');
    onError?.(null);
  }, [onError]);

  const loadContent = useCallback((content: string) => {
    setJsonText(content);
    onError?.(null);
  }, [onError]);

  const getParsedJSON = useCallback(() => {
    try {
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }, [jsonText]);

  const setJSONValue = useCallback((value: string | object) => {
    if (typeof value === 'string') {
      setJsonText(value);
    } else {
      setJsonText(JSON.stringify(value, null, 2));
    }
    onError?.(null);
  }, [onError]);

  const parseJSON = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      onError?.(null);
      return { success: true, data: parsed };
    } catch (err) {
      const errorMessage = 'JSON 형식이 올바르지 않습니다.';
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [jsonText, onError]);

  return {
    // State
    jsonText,
    textareaRef,
    
    // Actions
    handleTextChange,
    formatJSON,
    validateJSON,
    clearContent,
    loadContent,
    setJSONValue,
    parseJSON,
    
    // Utilities
    getParsedJSON,
    
    // Computed
    isEmpty: jsonText.trim() === '' || jsonText.trim() === '{}',
    isValid: (() => {
      try {
        JSON.parse(jsonText);
        return true;
      } catch {
        return false;
      }
    })(),
  };
}