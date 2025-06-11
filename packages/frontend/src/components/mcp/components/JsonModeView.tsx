import React, { useEffect, useRef } from 'react';
import { RefreshCw, Check, FileJson, Copy, CheckCircle2, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClientConfig } from '@langchain/mcp-adapters';
import { useJsonEditor, useMCPConfig, useCopyNotification } from '../hooks';

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
  // MCP Config management
  const mcpConfig = useMCPConfig({
    onError: setError,
    autoLoad: true,
  });

  // JSON Editor functionality
  const jsonEditor = useJsonEditor({
    // onError: setError, // 실시간 에러 체크 비활성화
    initialValue: '{}',
  });

  // Copy notification
  const { copyStatus, copyToClipboard, clearStatus } = useCopyNotification();

  // Track if initial config is loaded
  const isInitialLoadedRef = useRef(false);

  // Load initial config into editor (only once)
  useEffect(() => {
    if (mcpConfig.config && !isInitialLoadedRef.current) {
      jsonEditor.setJSONValue(mcpConfig.config);
      isInitialLoadedRef.current = true;
    }
  }, [mcpConfig.config, jsonEditor]);

  const handleSaveJSON = async () => {
    const parseResult = jsonEditor.parseJSON();
    
    if (!parseResult.success) {
      setError(parseResult.error || 'JSON 파싱 오류');
      return;
    }

    try {
      console.log('Saving config:', parseResult.data);
      await onSave(parseResult.data);
      await mcpConfig.saveConfig(parseResult.data);
    } catch (err) {
      console.error('JSON 저장 오류:', err);
      setError((err as Error).message);
    }
  };

  const handleCopyJSON = async () => {
    const result = await copyToClipboard(jsonEditor.jsonText);
    if (result.success) {
      onCopyJSON(jsonEditor.jsonText);
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
          onClick={jsonEditor.formatJSON}
          variant="ghost"
          className="px-3 py-2 h-auto bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm"
        >
          <FileJson className="h-4 w-4 mr-1" />
          포맷
        </Button>
        <Button
          onClick={handleCopyJSON}
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
            onClick={clearStatus}
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
          {mcpConfig.lastUpdated && (
            <span className="text-xs text-gray-500 ml-2">
              마지막 업데이트: {mcpConfig.lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="p-1">
          <Textarea
            ref={jsonEditor.textareaRef}
            rows={24}
            className="min-h-[600px] bg-gray-900/30 focus-visible:ring-gray-600 text-gray-300 font-mono border-gray-700 resize-none"
            value={jsonEditor.jsonText}
            onChange={jsonEditor.handleTextChange}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
          />
        </div>
      </div>
    </div>
  );
};