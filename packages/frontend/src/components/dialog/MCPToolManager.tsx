import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, RefreshCw, Server, Check, Plug, Copy, ChevronDown, ChevronUp, Zap, ShieldAlert, FileJson, Search, Edit, X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';


interface MCPToolManagerProps {
  onSettingsChanged?: () => void;
}

interface MCPTool {
  name: string;
  description?: string;
  status?: 'ready' | 'error' | 'unknown';
}

interface ServerConfig {
  command?: string;
  args?: string[];
  [key: string]: unknown;
}

interface MCPServer {
  name: string;
  config: ServerConfig;
  status?: 'online' | 'offline' | 'unknown';
  tools?: MCPTool[];
  expanded?: boolean;
}

// MCPServer 인터페이스에 일치하는 서버 정보 타입 정의
interface MCPServerInfo {
  name: string;
  config: ServerConfig;
  status: 'online' | 'offline' | 'unknown';
  tools: MCPTool[];
}

// 재시작 결과 인터페이스 추가
interface RestartResult {
  success: boolean;
  message: string;
}

// 서버 응답 타입 업데이트
interface ServerActionResponse {
  message: string;
  restart?: RestartResult;
}

// 서버 상태 표시에 사용할 상태 아이콘 컴포넌트
const ServerStatusIcon = ({ status }: { status: 'online' | 'offline' | 'unknown' }) => {
  let bgColor = 'bg-gray-800/50';
  let textColor = 'text-gray-400';
  
  if (status === 'online') {
    bgColor = 'bg-emerald-900/30';
    textColor = 'text-emerald-400';
  } else if (status === 'offline') {
    bgColor = 'bg-red-900/30';
    textColor = 'text-red-400';
  }
  
  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor} ${textColor} relative`}>
      <Plug className="h-5 w-5" />
      {status === 'online' && (
        <span className="absolute w-full h-full rounded-lg bg-emerald-400/20 animate-ping" />
      )}
    </div>
  );
};

// 도구 목록에 대한 컴포넌트 
const ToolsList = ({ tools, serverName }: { tools: MCPTool[], serverName: string }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredTools = searchTerm.trim()
    ? tools.filter(tool => 
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (tool.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tools;
    
  // 도구 이름에서 서버 접두사 제거 (serverName: 형식)
  const getDisplayName = (name: string) => {
    if (name.startsWith(`${serverName}:`)) {
      return name.substring(serverName.length + 1);
    }
    return name;
  };
  
  return (
    <div className="space-y-3">
      {tools.length > 6 && (
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-500" />
          </div>
          <input
            type="search"
            className="block w-full p-2 pl-10 text-sm bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-300"
            placeholder="도구 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}
      
      {filteredTools.length === 0 ? (
        <p className="text-gray-500 text-center py-2">검색 결과가 없습니다</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {filteredTools.map((tool, toolIdx) => (
            <li key={toolIdx} className="bg-black/20 p-3 rounded-md flex items-start gap-3 hover:bg-gray-800/20 transition-colors border border-transparent hover:border-gray-700">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                tool.status === 'ready' 
                  ? 'bg-emerald-900/20 text-emerald-400' 
                  : tool.status === 'error' 
                    ? 'bg-red-900/20 text-red-400'
                    : 'bg-gray-800/30 text-gray-400'
              }`}>
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 font-medium flex items-center">
                  {getDisplayName(tool.name)}
                  {tool.status === 'ready' && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </p>
                {tool.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-3">
                    {tool.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// 결과 알림 컴포넌트 추가
const ResultNotification = ({ result, onClose }: { result: RestartResult | null, onClose: () => void }) => {
  if (!result) return null;
  
  return (
    <div className={`fixed bottom-6 right-6 max-w-md ${result.success ? 'bg-emerald-900/90' : 'bg-red-900/90'} rounded-lg p-4 shadow-xl border ${result.success ? 'border-emerald-700' : 'border-red-700'} z-50 animate-fade-in`}>
      <div className="flex items-start gap-3">
        {result.success ? (
          <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          <p className={`text-sm ${result.success ? 'text-emerald-200' : 'text-red-200'}`}>
            {result.message}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// JSON 문자열 자동 수정 함수 추가
const autoFixJsonString = (jsonStr: string): string => {
  if (!jsonStr.trim()) return '';
  
  try {
    // 이미 유효한 JSON인지 확인
    JSON.parse(jsonStr);
    return jsonStr; // 이미 유효하면 그대로 반환
  } catch (e) {
    // 오류 메시지에서 힌트 얻기
    const errorMsg = e instanceof Error ? e.message : '';
    
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
    processedStr = processedStr.replace(/,\s*\]/g, ']');
    
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

// 잘못된 JSON을 감지하고 교정하는 메시지를 보여주는 컴포넌트
const JsonHelpMessage = ({ jsonString, onFix }: { jsonString: string, onFix: (fixed: string) => void }) => {
  if (!jsonString.trim()) return null;
  
  try {
    JSON.parse(jsonString);
    // 유효한 JSON이면 메시지 없음
    return null;
  } catch (e) {
    // 오류 메시지 생성
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

const MCPToolManager: React.FC<MCPToolManagerProps> = ({ onSettingsChanged }) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [newConfigJSON, setNewConfigJSON] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const isFetchingRef = useRef(false);
  // 유효성 검사 타이머 참조
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 편집 모드 상태
  const [editMode, setEditMode] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [editedConfig, setEditedConfig] = useState('');
  const [editedName, setEditedName] = useState('');
  
  // 서버 추가 모달 상태
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  
  // 재시작 결과 알림 상태 추가
  const [restartResult, setRestartResult] = useState<RestartResult | null>(null);
  
  // textarea 참조 객체들
  const editConfigRef = useRef<HTMLTextAreaElement>(null);
  const newConfigRef = useRef<HTMLTextAreaElement>(null);

  // 새 설정 JSON 처리
  const handleNewConfigChange = (value: string) => {
    // 현재 커서 위치 저장
    const cursorPosition = newConfigRef.current?.selectionStart || 0;
    
    // 값 업데이트
    setNewConfigJSON(value);
    setError(null);
    
    // 커서 위치 복원 - requestAnimationFrame 사용하여 안정적으로 포커스 유지
    requestAnimationFrame(() => {
      if (newConfigRef.current) {
        newConfigRef.current.focus();
        newConfigRef.current.selectionStart = cursorPosition;
        newConfigRef.current.selectionEnd = cursorPosition;
      }
    });
  };

  // 도구 목록 불러오기
  const fetchTools = async () => {
    // 이미 API 호출 중이면 중복 호출 방지
    if (isFetchingRef.current) {
      console.log('이미 API 호출 중입니다. 중복 호출 방지');
      return;
    }
    
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('API 호출: /api/mcp-tools');
      const response = await fetch('/api/mcp-tools', {
        cache: 'no-store', // 캐시 사용하지 않음 (항상 최신 데이터 가져오기)
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('도구 목록을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      console.log(`API 응답 성공: 서버 ${data.servers?.length || 0}개`);
      
      // 새로운 통합 API 응답 구조에 맞게 처리
      const serversList: MCPServer[] = data.servers.map((serverInfo: MCPServerInfo) => ({
        name: serverInfo.name,
        config: serverInfo.config,
        status: serverInfo.status,
        tools: serverInfo.tools,
        // 기존 확장 상태 유지 (있는 경우)
        expanded: servers.find(s => s.name === serverInfo.name)?.expanded || false
      }));
      
      setServers(serversList);
    } catch (err) {
      console.error('도구 목록 가져오기 오류:', err);
      setError(`도구 목록을 가져오는데 실패했습니다. 서버 연결 상태를 확인해주세요.`);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // 서버 상태 확인
  const refreshServerStatus = async () => {
    // 이미 API 호출 중이면 중복 호출 방지
    if (isFetchingRef.current) return;
    
    setIsCheckingStatus(true);
    
    try {
      // 통합 API를 사용하므로 fetchTools를 재사용
      await fetchTools();
    } catch (error) {
      console.error('서버 상태 확인 중 오류:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // 주기적으로 서버 상태 확인하는 효과 추가
  useEffect(() => {
    // 컴포넌트 마운트 시 딱 한 번만 실행되는 로직
    const initialFetch = async () => {
      // 초기 데이터 로드
      await fetchTools();
    };
    
    // 초기 데이터 로드 호출
    initialFetch();
    
    // 30초마다 자동 갱신 (중복 호출 방지 로직은 이미 refreshServerStatus 내에 있음)
    const intervalId = setInterval(() => {
      console.log('30초 주기 갱신 시작');
      refreshServerStatus();
    }, 30000);
    
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      console.log('컴포넌트 언마운트: 인터벌 정리');
      clearInterval(intervalId);
    };
  }, []); // 빈 의존성 배열 - 컴포넌트 마운트 시 한 번만 실행

  // 편집 중인 JSON 처리
  const handleEditedConfigChange = (value: string) => {
    // 현재 커서 위치 저장
    const cursorPosition = editConfigRef.current?.selectionStart || 0;
    
    // 값 업데이트
    setEditedConfig(value);
    setError(null);
    
    // 커서 위치 복원 - requestAnimationFrame 사용하여 안정적으로 포커스 유지
    requestAnimationFrame(() => {
      if (editConfigRef.current) {
        editConfigRef.current.focus();
        editConfigRef.current.selectionStart = cursorPosition;
        editConfigRef.current.selectionEnd = cursorPosition;
      }
    });
  };
  
  // 도구 추가
  const handleAddServer = async () => {
    if (!newConfigJSON.trim()) {
      setError('MCP 서버 설정을 입력해주세요');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // JSON 파싱
      const parsed = tryParseConfig(newConfigJSON);
      if (!parsed) return;
      
      const { mcpServers } = parsed;
      
      // 각 서버에 대해 API 호출
      for (const [name, config] of Object.entries(mcpServers)) {
        const response = await fetch('/api/mcp-tools', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            config,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`서버 ${name} 추가에 실패했습니다.`);
        }
        
        // 응답에서 재시작 결과 확인
        const data: ServerActionResponse = await response.json();
        if (data.restart) {
          setRestartResult(data.restart);
        }
      }
      
      // 폼 초기화
      setNewConfigJSON('');
      
      // 모달 닫기
      setShowAddServerModal(false);
      
      // 목록 새로고침
      await fetchTools();
      
      // 상위 컴포넌트에 변경 알림
      if (onSettingsChanged) onSettingsChanged();
    } catch (err) {
      console.error('서버 추가 오류:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 서버 삭제
  const handleDeleteServer = async (serverName: string) => {
    if (!window.confirm(`MCP 서버 '${serverName}'을(를) 삭제하시겠습니까?`)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/mcp-tools/${encodeURIComponent(serverName)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('서버 삭제에 실패했습니다.');
      }
      
      // 응답에서 재시작 결과 확인
      const data: ServerActionResponse = await response.json();
      if (data.restart) {
        setRestartResult(data.restart);
      }
      
      // 목록 새로고침
      await fetchTools();
      
      // 상위 컴포넌트에 변경 알림
      if (onSettingsChanged) onSettingsChanged();
    } catch (err) {
      console.error('서버 삭제 오류:', err);
      setError(`서버 삭제에 실패했습니다. 서버 연결 상태를 확인해주세요.`);
    } finally {
      setIsLoading(false);
    }
  };

  // 서버 확장/축소 토글
  const toggleServerExpanded = (index: number) => {
    setServers(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        expanded: !updated[index].expanded
      };
      return updated;
    });
  };

  // JSON 복사 기능
  const copyJSON = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('클립보드에 복사되었습니다.');
      })
      .catch(err => {
        console.error('복사 실패:', err);
        setError('클립보드에 복사하지 못했습니다.');
      });
  };

  // 서버 수정 시작
  const handleEditServer = (serverName: string, serverConfig: ServerConfig) => {
    // 이전 타이머 취소 (있을 경우)
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
      validationTimerRef.current = null;
    }
    
    // 설정을 JSON 문자열로 변환
    const configStr = JSON.stringify(serverConfig, null, 2);
    
    // 상태 업데이트
    setEditMode(true);
    setEditingServer(serverName);
    setEditedName(serverName);
    setEditedConfig(configStr);
    setError(null);
  };
  
  // 서버 수정 취소
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingServer(null);
    setEditedConfig('');
    setEditedName('');
    setError(null);
  };
  
  // 서버 수정 저장
  const handleSaveEdit = async () => {
    if (!editingServer) return;
    
    try {
      // 입력값 유효성 검사
      if (!editedName.trim()) {
        setError('서버 이름은 비워둘 수 없습니다.');
        return;
      }
      
      // 저장 시에만 JSON 파싱 시도
      let configObj;
      try {
        configObj = JSON.parse(editedConfig);
        
        // transport 필드 필수 검증 제거 (선택 사항으로 처리)
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : '구문 오류';
        setError(`유효하지 않은 JSON 형식입니다: ${errorMessage}`);
        return;
      }
      
      setIsLoading(true);
      setError(null);  // 오류 메시지 초기화
      
      // API 호출하여 서버 수정
      const response = await fetch(`/api/mcp-tools/${encodeURIComponent(editingServer)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedName,
          config: configObj
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '서버 수정에 실패했습니다.');
      }
      
      // 응답에서 재시작 결과 확인
      const data: ServerActionResponse = await response.json();
      if (data.restart) {
        setRestartResult(data.restart);
      }
      
      // 성공 시 상태 초기화
      setEditMode(false);
      setEditingServer(null);
      setEditedConfig('');
      setEditedName('');
      
      // 목록 새로고침
      await fetchTools();
      
      // 상위 컴포넌트에 변경 알림
      if (onSettingsChanged) onSettingsChanged();
      
    } catch (err) {
      console.error('서버 수정 오류:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 수동으로 MCP 서비스 재시작
  const handleRestartService = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mcp-tools/restart', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('MCP 서비스 재시작에 실패했습니다.');
      }
      
      const data = await response.json();
      setRestartResult({
        success: data.success,
        message: data.message
      });
      
      // 재시작 후 목록 새로고침
      await fetchTools();
      
    } catch (err) {
      console.error('MCP 서비스 재시작 오류:', err);
      setError(`MCP 서비스 재시작에 실패했습니다: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 수정 모달 컴포넌트
  const EditModal = () => {
    if (!editMode) return null;
    
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-200">MCP 서버 수정</h3>
            <button 
              onClick={handleCancelEdit}
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
                onChange={(e) => setEditedName(e.target.value)}
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
                  onChange={(e) => handleEditedConfigChange(e.target.value)}
                  className="w-full p-3 text-sm bg-transparent focus:ring-indigo-500 focus:border-indigo-500 text-gray-300 font-mono border-0 resize-none"
                  placeholder='{"transport": "stdio", "command": "python", "args": ["경로/스크립트.py"]}'
                  spellCheck="false"
                  autoComplete="off"
                  autoCorrect="off"
                  wrap="off"
                ></textarea>
              </div>
              
              {/* JSON 오류 감지 및 자동 수정 안내 메시지 추가 */}
              <JsonHelpMessage 
                jsonString={editedConfig} 
                onFix={handleEditedConfigChange} 
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm"
                disabled={isLoading}
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
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
  
  // 서버 추가 모달 컴포넌트
  const AddServerModal = () => {
    if (!showAddServerModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-200">MCP 서버 추가</h3>
            <button 
              onClick={() => {
                setShowAddServerModal(false);
                setNewConfigJSON('');
                setError(null);
              }}
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
            <p className="text-amber-200 text-sm">MCP 서버를 추가한 후에는 <strong>서비스 재시작</strong> 버튼을 눌러 변경사항을 적용해야 합니다.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                MCP 설정 JSON (직접 붙여넣기)
              </label>
              <div className="relative border border-gray-700 rounded-lg bg-gray-800 overflow-hidden">
                <textarea
                  key="new-config-textarea" 
                  ref={newConfigRef}
                  rows={10}
                  className="w-full p-3 text-sm bg-transparent focus:ring-indigo-500 focus:border-indigo-500 text-gray-300 font-mono border-0 resize-none"
                  placeholder='{"서버이름": {"transport": "stdio", "command": "python", "args": ["경로/스크립트.py"]}}'
                  value={newConfigJSON}
                  onChange={(e) => handleNewConfigChange(e.target.value)}
                  spellCheck="false"
                  autoComplete="off"
                  autoCorrect="off"
                  wrap="off"
                ></textarea>
              </div>
              
              {/* JSON 오류 감지 및 자동 수정 안내 메시지 */}
              <JsonHelpMessage 
                jsonString={newConfigJSON} 
                onFix={handleNewConfigChange} 
              />
            </div>
            
            {/* 참고 사이트 링크 */}
            <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
              <h4 className="text-sm font-medium text-gray-300 mb-2">참고 사이트</h4>
              <div className="flex flex-col space-y-2">
                <a 
                  href="https://smithery.ai/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                >
                  <Plug className="h-4 w-4" /> Smithery.ai
                </a>
                <a 
                  href="https://cursor.directory/mcp" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                >
                  <Server className="h-4 w-4" /> Cursor MCP Directory
                </a>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddServerModal(false);
                  setNewConfigJSON('');
                  setError(null);
                }}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm"
                disabled={isLoading}
              >
                취소
              </button>
              <button
                onClick={handleAddServer}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm flex items-center gap-1"
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                서버 추가
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // JSON 모드 컴포넌트
  const JsonModeView = () => {
    const allServersConfig = servers.reduce((acc, server) => {
      acc[server.name] = server.config;
      return acc;
    }, {} as Record<string, ServerConfig>);
    
    // 간단한 텍스트 에디터로 변경
    const [jsonText, setJsonText] = useState(JSON.stringify(allServersConfig, null, 2));
    const jsonTextareaRef = useRef<HTMLTextAreaElement>(null);
    
    // 서버 목록이 변경되면 JSON 텍스트 업데이트
    useEffect(() => {
      setJsonText(JSON.stringify(allServersConfig, null, 2));
    }, [servers]);
    
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
        
        setIsLoading(true);
        setError(null);
        
        // 현재 서버 이름 목록 (삭제 감지용)
        const currentServerNames = servers.map(server => server.name);
        const newServerNames = Object.keys(configObj);
        
        // 삭제된 서버 처리
        for (const serverName of currentServerNames) {
          if (!newServerNames.includes(serverName)) {
            // 서버가 삭제됨 - API 호출하여 서버 삭제
            const response = await fetch(`/api/mcp-tools/${encodeURIComponent(serverName)}`, {
              method: 'DELETE',
            });
            
            if (!response.ok) {
              throw new Error(`서버 ${serverName} 삭제에 실패했습니다.`);
            }
          }
        }
        
        // 새로운/수정된 서버 처리
        for (const [serverName, config] of Object.entries(configObj)) {
          if (currentServerNames.includes(serverName)) {
            // 기존 서버 업데이트
            const response = await fetch(`/api/mcp-tools/${encodeURIComponent(serverName)}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: serverName,
                config
              }),
            });
            
            if (!response.ok) {
              throw new Error(`서버 ${serverName} 업데이트에 실패했습니다.`);
            }
          } else {
            // 새 서버 추가
            const response = await fetch('/api/mcp-tools', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: serverName,
                config,
              }),
            });
            
            if (!response.ok) {
              throw new Error(`서버 ${serverName} 추가에 실패했습니다.`);
            }
          }
        }
        
        // 목록 새로고침
        await fetchTools();
        
        // 상위 컴포넌트에 변경 알림
        if (onSettingsChanged) onSettingsChanged();
      } catch (err) {
        console.error('JSON 저장 오류:', err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    return (
      <div className="space-y-4">
        {/* 버튼 영역 */}
        <div className="flex justify-end space-x-2">
          <button
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm flex items-center gap-1"
            onClick={handleSaveJSON}
            disabled={isLoading}
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            저장
          </button>
          <button
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200 text-sm flex items-center gap-1"
            onClick={formatJSON}
          >
            <FileJson className="h-4 w-4" /> 포맷
          </button>
          <button
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm flex items-center gap-1"
            onClick={() => copyJSON(jsonText)}
          >
            <Copy className="h-4 w-4" /> 복사
          </button>
        </div>
        
        {/* JSON 텍스트 에디터 */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700">
            <span className="text-sm text-gray-300">MCP 서버 설정 (JSON)</span>
          </div>
          <textarea
            ref={jsonTextareaRef}
            rows={24}
            className="w-full p-3 text-sm bg-gray-900/30 focus:ring-indigo-500 focus:border-indigo-500 text-gray-300 font-mono border-0 resize-none block"
            value={jsonText}
            onChange={handleTextChange}
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
          ></textarea>
        </div>
        
        {/* JSON 오류 감지 및 자동 수정 안내 메시지 추가 */}
        <JsonHelpMessage 
          jsonString={jsonText} 
          onFix={setJsonText} 
        />
      </div>
    );
  };

  // JSON 구성을 파싱하는 유틸리티 함수
  const tryParseConfig = (jsonString: string): { mcpServers: Record<string, ServerConfig> } | null => {
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

  // cleanup 타이머
  useEffect(() => {
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="p-6 bg-gray-950 rounded-xl border border-gray-800 relative">
      {/* 수정 모달 */}
      <EditModal />
      
      {/* 서버 추가 모달 */}
      <AddServerModal />
      
      {/* 재시작 결과 알림 */}
      <ResultNotification 
        result={restartResult} 
        onClose={() => setRestartResult(null)} 
      />
      
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Plug className="h-5 w-5 text-indigo-400" /> MCP 도구 관리
      </h2>
      
      {!jsonMode && (
        <button 
          onClick={() => setJsonMode(true)}
          className="absolute top-6 right-6 text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 flex items-center gap-1 hover:bg-gray-700"
        >
          <FileJson className="h-3 w-3" /> JSON 모드
        </button>
      )}
      
      {jsonMode && (
        <button 
          onClick={() => setJsonMode(false)}
          className="absolute top-6 right-6 text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 flex items-center gap-1 hover:bg-gray-700"
        >
          <Server className="h-3 w-3" /> 서버 모드
        </button>
      )}
      
      {error && !editMode && !showAddServerModal && (
        <div className="my-4 p-3 bg-red-950/30 border border-red-800 rounded-lg flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
      
      {/* 재시작 필요 안내 메시지 추가 */}
      {!editMode && !showAddServerModal && (
        <div className="my-4 p-3 bg-amber-950/30 border border-amber-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-amber-200 text-sm">
            <p className="font-medium mb-1">중요 안내</p>
            <p>MCP 도구 설정을 변경(추가/수정/삭제)한 후에는 변경사항을 적용하기 위해 반드시 <strong>서비스 재시작</strong> 버튼을 눌러주세요.</p>
          </div>
        </div>
      )}
      
      <div className="mt-6">
        {isLoading && !editMode && !showAddServerModal ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-5 w-5 text-indigo-400 animate-spin" />
            <span className="ml-2 text-gray-400">도구 목록 로드 중...</span>
          </div>
        ) : jsonMode ? (
          // JSON 모드 UI (간소화됨)
          <JsonModeView />
        ) : (
          // 서버 모드 UI
          <div>
            {servers.length === 0 ? (
              <div className="bg-gray-900/50 rounded-lg p-6 text-center">
                <Server className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">등록된 MCP 서버가 없습니다</p>
                <button
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm inline-flex items-center gap-1"
                  onClick={() => setShowAddServerModal(true)}
                >
                  <Plus className="h-4 w-4" /> 서버 등록하기
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {servers.map((server, serverIdx) => (
                  <div 
                    key={serverIdx}
                    className="bg-gray-900/30 rounded-lg border border-gray-800 overflow-hidden"
                  >
                    <div className="p-4 flex items-center gap-4">
                      <ServerStatusIcon status={server.status || 'unknown'} />
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-200 flex items-center gap-2">
                          {server.name}
                          {server.status === 'online' && (
                            <span className="text-xs px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded-full">온라인</span>
                          )}
                          {server.status === 'offline' && (
                            <span className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 rounded-full">오프라인</span>
                          )}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {server.tools && server.tools.length > 0 ? (
                            `${server.tools.length}개 도구 제공 중`
                          ) : (
                            '도구 없음'
                          )}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"
                          onClick={() => toggleServerExpanded(serverIdx)}
                          title={server.expanded ? '접기' : '펼치기'}
                        >
                          {server.expanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                        
                        <button
                          className="p-2 text-gray-500 hover:text-indigo-400 rounded-lg hover:bg-gray-800"
                          onClick={() => handleEditServer(server.name, server.config)}
                          title="서버 수정"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        
                        <button
                          className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800"
                          onClick={() => handleDeleteServer(server.name)}
                          title="서버 삭제"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    {server.expanded && (
                      <div className="border-t border-gray-800 p-4 bg-black/30">
                        {server.tools && server.tools.length > 0 ? (
                          <ToolsList tools={server.tools} serverName={server.name} />
                        ) : (
                          <p className="text-gray-500 text-center py-4">이 서버에서 제공하는 도구가 없습니다</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm flex items-center gap-1"
                      onClick={() => setShowAddServerModal(true)}
                    >
                      <Plus className="h-4 w-4" /> 서버 추가
                    </button>
                    
                    <button
                      className="px-3 py-2 relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white text-sm flex items-center gap-1 shadow-lg shadow-purple-900/30 group"
                      onClick={handleRestartService}
                      disabled={isLoading}
                    >
                      <span className="absolute inset-0 bg-white/20 rounded-lg animate-pulse group-hover:bg-transparent"></span>
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : 'group-hover:animate-spin'}`} /> 
                      <span className="font-medium">서비스 재시작</span>
                    </button>
                  </div>
                  
                  <button
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm flex items-center gap-1"
                    onClick={refreshServerStatus}
                    disabled={isLoading || isCheckingStatus}
                  >
                    {isCheckingStatus ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> 확인 중...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" /> 상태 확인
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MCPToolManager; 