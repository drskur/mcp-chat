import React from 'react';
import { FileJson } from 'lucide-react';
import { autoFixJsonString } from '../utils';

interface JsonHelpMessageProps {
  jsonString: string;
  onFix: (fixed: string) => void;
}

export const JsonHelpMessage: React.FC<JsonHelpMessageProps> = ({ jsonString, onFix }) => {
  if (!jsonString.trim()) return null;
  
  try {
    JSON.parse(jsonString);
    // 유효한 JSON이면 메시지 없음
    return null;
  } catch (e) {
    // JSON 파싱 오류 시 자동 수정 시도
    const fixedJson = autoFixJsonString(jsonString);
    const isFixed = fixedJson !== jsonString;
    
    return (
      <div className="mt-2 p-2 bg-amber-900/30 border border-amber-700 rounded text-xs text-amber-300">
        <p className="font-medium mb-1">JSON 형식 오류 감지됨</p>
        <p>
          {isFixed 
            ? '아래 수정 버튼을 클릭하여 JSON 형식을 자동으로 교정할 수 있습니다:' 
            : '붙여넣은 JSON이 유효하지 않습니다. 다음 형식을 확인하세요:'}
        </p>
        {isFixed && (
          <button 
            onClick={() => onFix(fixedJson)}
            className="mt-2 px-2 py-1 bg-amber-700 hover:bg-amber-600 rounded text-white text-xs flex items-center gap-1"
          >
            <FileJson className="h-3 w-3" /> JSON 자동 수정
          </button>
        )}
        {!isFixed && (
          <pre className="mt-1 p-1 bg-black/30 rounded overflow-x-auto">
            {`{"서버이름": { 서버설정객체 }}`}
          </pre>
        )}
      </div>
    );
  }
};