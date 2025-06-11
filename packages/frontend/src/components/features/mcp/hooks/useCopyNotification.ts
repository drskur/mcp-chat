import { useState, useCallback } from 'react';

type CopyStatus = 'success' | 'error' | null;

export function useCopyNotification() {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('success');
      
      // Auto-clear status after 3 seconds
      setTimeout(() => {
        setCopyStatus(null);
      }, 3000);
      
      return { success: true };
    } catch (err) {
      console.error('복사 실패:', err);
      setCopyStatus('error');
      
      // Auto-clear status after 3 seconds
      setTimeout(() => {
        setCopyStatus(null);
      }, 3000);
      
      return { success: false, error: '클립보드에 복사하지 못했습니다.' };
    }
  }, []);

  const clearStatus = useCallback(() => {
    setCopyStatus(null);
  }, []);

  return {
    copyStatus,
    copyToClipboard,
    clearStatus,
  };
}