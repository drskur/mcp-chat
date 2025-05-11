import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, FileText, AlertCircle, CheckCircle2, Sparkles, RotateCcw } from 'lucide-react';

interface SystemPromptEditorProps {
  onSettingsChanged?: () => void;
}

const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({ onSettingsChanged }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveAndRestart, setSaveAndRestart] = useState(false);

  // 프롬프트 가져오기
  const fetchPrompt = async () => {
    setIsLoading(true);
    setError(null);
    setIsSaved(false);
    
    try {
      const response = await fetch('/api/prompt');
      if (!response.ok) {
        throw new Error(`시스템 프롬프트를 가져오는데 실패했습니다 (${response.status})`);
      }
      
      const data = await response.json();
      setPrompt(data.content || '');
    } catch (err) {
      console.error('프롬프트 가져오기 오류:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 로딩
  useEffect(() => {
    fetchPrompt();
  }, []);

  // 프롬프트 저장
  const handleSavePrompt = async (restartAfterSave: boolean = false) => {
    if (!prompt.trim()) {
      setError('시스템 프롬프트를 입력해주세요');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setIsSaved(false);
    setSaveAndRestart(restartAfterSave);
    
    try {
      // YAML 형식 간단 검증
      if (!prompt.includes('system_prompt:')) {
        throw new Error('system_prompt: 필드가 필요합니다');
      }
      
      const response = await fetch('/api/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: prompt }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `시스템 프롬프트 저장에 실패했습니다 (${response.status})`);
      }
      
      setIsSaved(true);
      
      // 상위 컴포넌트에 변경 알림
      if (onSettingsChanged) onSettingsChanged();
      
      // 저장 후 에이전트 재시작 (요청 시)
      if (restartAfterSave) {
        await restartAgent();
      }
      
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (err) {
      console.error('프롬프트 저장 오류:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setSaveAndRestart(false);
    }
  };

  // 에이전트 재시작
  const restartAgent = async () => {
    setIsRestarting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/chat/reinit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error(`에이전트 재시작에 실패했습니다 (${response.status})`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || '에이전트 재시작 중 오류가 발생했습니다');
      }
      
      // 성공 메시지 설정 (이미 저장 성공 메시지가 표시되어 있으면 변경하지 않음)
      if (!isSaved) {
        setIsSaved(true);
        setTimeout(() => {
          setIsSaved(false);
        }, 3000);
      }
    } catch (err) {
      console.error('에이전트 재시작 오류:', err);
      setError((err as Error).message);
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className="space-y-6 text-gray-100">
      {/* 알림 메시지 - 에러 */}
      {error && (
        <div className="p-4 bg-red-900/40 backdrop-blur-sm text-red-200 rounded-lg border border-red-700/50 shadow-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-red-300 mb-1">오류 발생</h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {/* 알림 메시지 - 성공 */}
      {isSaved && (
        <div className="p-4 bg-green-900/40 backdrop-blur-sm text-green-200 rounded-lg border border-green-700/50 shadow-lg flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-green-300 mb-1">저장 완료</h4>
            <p className="text-sm">
              {saveAndRestart 
                ? '시스템 프롬프트가 저장되었고 에이전트가 재시작되었습니다.' 
                : '시스템 프롬프트가 성공적으로 저장되었습니다.'}
            </p>
          </div>
        </div>
      )}
      
      {/* 프롬프트 편집기 */}
      <div className="border rounded-xl overflow-hidden border-gray-700/70 shadow-xl bg-gradient-to-b from-gray-800/80 to-gray-900/80 backdrop-blur-sm">
        {/* 편집기 헤더 */}
        <div className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 p-4 border-b border-gray-700/70">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              <h3 className="font-medium text-gray-200">시스템 프롬프트 (YAML)</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => restartAgent()}
                disabled={isLoading || isRestarting}
                className="p-2 rounded-md hover:bg-indigo-700/30 text-indigo-300 transition-all group"
                aria-label="에이전트 재시작"
                title="에이전트 재시작"
              >
                <RotateCcw size={18} className={`${isRestarting ? 'animate-spin text-indigo-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>
              <button
                onClick={fetchPrompt}
                disabled={isLoading || isRestarting}
                className="p-2 rounded-md hover:bg-gray-700/70 text-gray-300 transition-all hover:text-indigo-300 group"
                aria-label="새로고침"
                title="프롬프트 새로고침"
              >
                <RefreshCw size={18} className={`${isLoading ? 'animate-spin text-indigo-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* 편집기 본문 */}
        <div className="p-5 bg-gray-900/50 backdrop-blur-sm">
          <div className="space-y-5">
            {/* 안내 설명 */}
            <div className="p-3 border border-indigo-900/70 rounded-lg bg-indigo-900/20 backdrop-blur-sm flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-indigo-200">
                YAML 형식으로 <code className="bg-indigo-800/70 p-1 rounded text-indigo-200 font-mono">system_prompt</code> 필드를 정의해야 합니다.
                <code className="bg-indigo-800/70 p-1 rounded text-indigo-200 font-mono ml-1">{'{system_time}'}</code> 변수를 사용하여 현재 시간을 포함할 수 있습니다.
              </p>
            </div>
            
            {/* 텍스트 에디터 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg opacity-30 group-hover:opacity-100 transition-opacity blur-sm"></div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading || isRestarting}
                className="relative w-full p-4 border rounded-lg font-mono text-sm h-72 bg-gray-950 border-gray-700/50 text-gray-200 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 transition-all shadow-inner"
                placeholder="# 시스템 프롬프트
system_prompt: |
  당신은 MCP Agent라는 AI 도우미입니다. 
  사용자의 작업을 도와주기 위해 다양한 도구를 사용할 수 있습니다.
  공손하고 친절하게 한국어로 응답하세요.

  현재 시간: {system_time}"
              />
            </div>
            
            {/* 저장 버튼 */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleSavePrompt(false)}
                disabled={isLoading || isRestarting || !prompt.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                <Save size={18} />
                저장만 하기
              </button>
              
              <button
                onClick={() => handleSavePrompt(true)}
                disabled={isLoading || isRestarting || !prompt.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-[0_4px_12px_rgba(79,70,229,0.4)] hover:shadow-[0_6px_16px_rgba(79,70,229,0.6)]"
              >
                {(isLoading && saveAndRestart) || isRestarting ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    <RotateCcw size={14} className="ml-1" />
                  </>
                )}
                {(isLoading && saveAndRestart) || isRestarting ? '처리 중...' : '저장 후 에이전트 재시작'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 정보 카드 */}
      <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/70 backdrop-blur-sm">
        <h4 className="text-sm font-medium text-gray-300 mb-2">프롬프트 작성 팁</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-indigo-900/70 text-indigo-300 flex items-center justify-center text-xs flex-shrink-0">1</span>
            <span>시스템 프롬프트는 AI의 페르소나, 행동 방식, 응답 스타일을 정의합니다.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-indigo-900/70 text-indigo-300 flex items-center justify-center text-xs flex-shrink-0">2</span>
            <span>필요한 정보와 제한사항을 명확하게 작성해야 원하는 응답을 얻을 수 있습니다.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-indigo-900/70 text-indigo-300 flex items-center justify-center text-xs flex-shrink-0">3</span>
            <span>프롬프트 변경 후에는 몇 가지 테스트 질문으로 AI 응답을 확인해보세요.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SystemPromptEditor; 