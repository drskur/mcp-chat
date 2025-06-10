import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Check, FileJson, Copy, CheckCircle2, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { autoFixJsonString } from '../utils';
import { JsonHelpMessage } from '@/components/mcp';
import { getMCPConfig } from '@/app/actions/mcp/server';
import { ClientConfig } from '@langchain/mcp-adapters';

interface JsonModeViewProps {
  isLoading: boolean;
  error: string | null;
  onSave: (configObj: ClientConfig) => Promise<void>;
  onCopyJSON: (text: string) => void;
  setError: (error: string | null) => void;
}

export const JsonModeView: React.FC<JsonModeViewProps> = ({
  isLoading,
  onSave,
  onCopyJSON,
  setError,
}) => {
  const [jsonText, setJsonText] = useState('{}');
  const [copyStatus, setCopyStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    getMCPConfig().then((conf) => {
      setJsonText(JSON.stringify(conf, null, 2));
    });
  }, []);


  const jsonTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 현재 커서 위치 저장
    const cursorPosition = e.target.selectionStart || 0;

    // 텍스트 업데이트
    setJsonText(e.target.value);
    setError(null);

    // 비동기로 커서 위치 복원
    setTimeout(() => {
      if (jsonTextareaRef.current) {
        jsonTextareaRef.current.focus();
        jsonTextareaRef.current.selectionStart = cursorPosition;
        jsonTextareaRef.current.selectionEnd = cursorPosition;
      }
    }, 0);
  };

  // 포맷 JSON 함수 추가
  const formatJSON = () => {
    try {
      // 먼저 자동 수정 시도 (필요한 경우)
      const fixedJson = autoFixJsonString(jsonText);

      // 파싱해서 포맷팅
      const parsed = JSON.parse(fixedJson);
      // 예쁘게 포맷팅하여 다시 설정
      setJsonText(JSON.stringify(parsed, null, 2));
    } catch (e) {
      // 파싱 오류가 있을 경우 무시
      const errorMessage = e instanceof Error ? e.message : '구문 오류';
      setError(`JSON 형식 오류: ${errorMessage}`);
    }
  };

  const handleSaveJSON = async () => {
    try {
      // JSON 파싱 시도
      let configObj;
      try {
        // 먼저 자동 수정 시도
        const fixedJson = autoFixJsonString(jsonText);
        configObj = JSON.parse(fixedJson);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : '구문 오류';
        setError(`유효하지 않은 JSON 형식입니다: ${errorMessage}`);
        return;
      }

      console.log(configObj);

      await onSave(configObj);
    } catch (err) {
      console.error('JSON 저장 오류:', err);
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      {/* 버튼 영역 */}
      <div className="flex justify-end space-x-2">
        <Button
          onClick={handleSaveJSON}
          disabled={isLoading}
          className="px-3 py-2 h-auto bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}
          저장
        </Button>
        <Button
          onClick={formatJSON}
          variant="ghost"
          className="px-3 py-2 h-auto bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm"
        >
          <FileJson className="h-4 w-4 mr-1" />
          포맷
        </Button>
        <Button
          onClick={() => {
            navigator.clipboard
              .writeText(jsonText)
              .then(() => {
                setCopyStatus('success');
                onCopyJSON(jsonText);
              })
              .catch((err) => {
                console.error('복사 실패:', err);
                setCopyStatus('error');
              });
          }}
          variant="ghost"
          className="px-3 py-2 h-auto bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm"
        >
          <Copy className="h-4 w-4 mr-1" />
          복사
        </Button>
      </div>

      {/* 복사 알림 */}
      {copyStatus && (
        <Alert className={`relative border-white ${copyStatus === 'success' ? 'bg-green-950/30' : 'bg-red-950/30'}`}>
          {copyStatus === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-white stroke-white" />
          ) : (
            <XCircle className="h-4 w-4 text-white stroke-white" />
          )}
          <AlertDescription className="text-white">
            {copyStatus === 'success' ? '클립보드에 복사되었습니다.' : '클립보드에 복사하지 못했습니다.'}
          </AlertDescription>
          <Button
            onClick={() => setCopyStatus(null)}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-gray-800/50"
          >
            <X className="h-3 w-3 text-white stroke-white" />
          </Button>
        </Alert>
      )}

      {/* JSON 텍스트 에디터 */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-sm text-gray-300">MCP 서버 설정 (JSON)</span>
        </div>
        <div className="p-1">
          <Textarea
            ref={jsonTextareaRef}
            rows={24}
            className="min-h-[600px] bg-gray-900/30 focus-visible:ring-gray-600 text-gray-300 font-mono border-gray-700 resize-none"
            value={jsonText}
            onChange={handleTextChange}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
          />
        </div>
      </div>

      <JsonHelpMessage jsonString={jsonText} onFix={setJsonText} />
    </div>
  );
};
