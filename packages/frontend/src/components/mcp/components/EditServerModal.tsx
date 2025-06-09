import React, { useRef } from 'react';
import { X, RefreshCw, Check, ShieldAlert, AlertTriangle } from 'lucide-react';
import { JsonHelpMessage } from '@/components/mcp';

interface EditServerModalProps {
  isOpen: boolean;
  editedName: string;
  editedConfig: string;
  error: string | null;
  isLoading: boolean;
  onNameChange: (name: string) => void;
  onConfigChange: (config: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const EditServerModal: React.FC<EditServerModalProps> = ({
  isOpen,
  editedName,
  editedConfig,
  error,
  isLoading,
  onNameChange,
  onConfigChange,
  onCancel,
  onSave
}) => {
  const editConfigRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const handleConfigChange = (value: string) => {
    // 현재 커서 위치 저장
    const cursorPosition = editConfigRef.current?.selectionStart || 0;

    // 값 업데이트
    onConfigChange(value);

    // 커서 위치 복원 - requestAnimationFrame 사용하여 안정적으로 포커스 유지
    requestAnimationFrame(() => {
      if (editConfigRef.current) {
        editConfigRef.current.focus();
        editConfigRef.current.selectionStart = cursorPosition;
        editConfigRef.current.selectionEnd = cursorPosition;
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-200">MCP 서버 수정</h3>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-200 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="my-4 p-3 bg-red-950/30 border border-red-800 rounded-lg flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* 설정 변경 후 재시작 안내 추가 */}
        <div className="my-4 p-3 bg-amber-950/30 border border-amber-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-amber-200 text-sm">MCP 서버 설정을 변경한 후에는 <strong>서비스 재시작</strong> 버튼을 눌러 변경사항을 적용해야 합니다.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              서버 이름
            </label>
            <input
              type="text"
              value={editedName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full p-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-300"
              placeholder="서버 이름"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              서버 설정 (JSON)
            </label>
            <div className="relative border border-gray-700 rounded-lg bg-gray-800 overflow-hidden">
              <textarea
                key="edit-config-textarea"
                ref={editConfigRef}
                rows={10}
                value={editedConfig}
                onChange={(e) => handleConfigChange(e.target.value)}
                className="w-full p-3 text-sm bg-transparent focus:ring-indigo-500 focus:border-indigo-500 text-gray-300 font-mono border-0 resize-none"
                placeholder='{"transport": "stdio", "command": "python", "args": ["경로/스크립트.py"]}'
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                wrap="off"
              ></textarea>
            </div>

            <JsonHelpMessage
              jsonString={editedConfig}
              onFix={handleConfigChange}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              onClick={onSave}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm flex items-center gap-1"
              disabled={isLoading}
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};