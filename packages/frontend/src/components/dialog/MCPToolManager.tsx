import React, { useState, useEffect, useRef } from 'react';
import {
  Plug,
  FileJson,
  Server,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import {
  MCPToolManagerProps,
  MCPServer,
  MCPServerInfo,
  ServerConfig,
  ServerActionResponse,
  RestartResult,
} from '@/types/mcp';
import {
  ResultNotification,
  EditServerModal,
  JsonModeView,
  ServerCard,
  EmptyServerState,
} from '@/components/mcp';
import { getMCPServers } from '@/app/actions/mcp/tools';

const MCPToolManager: React.FC<MCPToolManagerProps> = ({
  onSettingsChanged,
}) => {
  // 상태 관리
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const isFetchingRef = useRef(false);
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 편집 모드 상태
  const [editMode, setEditMode] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [editedConfig, setEditedConfig] = useState('');
  const [editedName, setEditedName] = useState('');

  // 재시작 결과 알림 상태
  const [restartResult, setRestartResult] = useState<RestartResult | null>(
    null,
  );

  // 도구 목록 불러오기
  const fetchTools = async () => {
    if (isFetchingRef.current) {
      console.log('이미 API 호출 중입니다. 중복 호출 방지');
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const { servers } = await getMCPServers();

      setServers(servers);
    } catch (err) {
      console.error('도구 목록 가져오기 오류:', err);
      setError(
        `도구 목록을 가져오는데 실패했습니다. 서버 연결 상태를 확인해주세요.`,
      );
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // 서버 상태 확인
  const refreshServerStatus = async () => {
    if (isFetchingRef.current) return;

    setIsCheckingStatus(true);

    try {
      await fetchTools();
    } catch (error) {
      console.error('서버 상태 확인 중 오류:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // 초기 로드 및 주기적 갱신
  useEffect(() => {
    const initialFetch = async () => {
      await fetchTools();
    };

    initialFetch();

    const intervalId = setInterval(() => {
      console.log('30초 주기 갱신 시작');
      refreshServerStatus();
    }, 30000);

    return () => {
      console.log('컴포넌트 언마운트: 인터벌 정리');
      clearInterval(intervalId);
    };
  }, []);

  // 서버 삭제
  const handleDeleteServer = async (serverName: string) => {
    if (!window.confirm(`MCP 서버 '${serverName}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/mcp-tools/${encodeURIComponent(serverName)}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('서버 삭제에 실패했습니다.');
      }

      const data: ServerActionResponse = await response.json();
      if (data.restart) {
        setRestartResult(data.restart);
      }

      await fetchTools();

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
    setServers((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        expanded: !updated[index].expanded,
      };
      return updated;
    });
  };

  // JSON 복사 기능
  const copyJSON = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert('클립보드에 복사되었습니다.');
      })
      .catch((err) => {
        console.error('복사 실패:', err);
        setError('클립보드에 복사하지 못했습니다.');
      });
  };

  // 서버 수정 시작
  const handleEditServer = (serverName: string, serverConfig: ServerConfig) => {
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
      validationTimerRef.current = null;
    }

    const configStr = JSON.stringify(serverConfig, null, 2);

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
      if (!editedName.trim()) {
        setError('서버 이름은 비워둘 수 없습니다.');
        return;
      }

      let configObj;
      try {
        configObj = JSON.parse(editedConfig);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : '구문 오류';
        setError(`유효하지 않은 JSON 형식입니다: ${errorMessage}`);
        return;
      }

      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/mcp-tools/${encodeURIComponent(editingServer)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editedName,
            config: configObj,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '서버 수정에 실패했습니다.');
      }

      const data: ServerActionResponse = await response.json();
      if (data.restart) {
        setRestartResult(data.restart);
      }

      setEditMode(false);
      setEditingServer(null);
      setEditedConfig('');
      setEditedName('');

      await fetchTools();

      if (onSettingsChanged) onSettingsChanged();
    } catch (err) {
      console.error('서버 수정 오류:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // MCP 서비스 재시작
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
        message: data.message,
      });

      await fetchTools();
    } catch (err) {
      console.error('MCP 서비스 재시작 오류:', err);
      setError(`MCP 서비스 재시작에 실패했습니다: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // JSON 모드 저장 핸들러
  const handleJsonSave = async (configObj: Record<string, ServerConfig>) => {
    setIsLoading(true);
    setError(null);

    try {
      const currentServerNames = servers.map((server) => server.name);
      const newServerNames = Object.keys(configObj);

      // 삭제된 서버 처리
      for (const serverName of currentServerNames) {
        if (!newServerNames.includes(serverName)) {
          const response = await fetch(
            `/api/mcp-tools/${encodeURIComponent(serverName)}`,
            {
              method: 'DELETE',
            },
          );

          if (!response.ok) {
            throw new Error(`서버 ${serverName} 삭제에 실패했습니다.`);
          }
        }
      }

      // 새로운/수정된 서버 처리
      for (const [serverName, config] of Object.entries(configObj)) {
        if (currentServerNames.includes(serverName)) {
          // 기존 서버 업데이트
          const response = await fetch(
            `/api/mcp-tools/${encodeURIComponent(serverName)}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: serverName,
                config,
              }),
            },
          );

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

      await fetchTools();

      if (onSettingsChanged) onSettingsChanged();
    } finally {
      setIsLoading(false);
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
      <EditServerModal
        isOpen={editMode}
        editedName={editedName}
        editedConfig={editedConfig}
        error={error}
        isLoading={isLoading}
        onNameChange={setEditedName}
        onConfigChange={setEditedConfig}
        onCancel={handleCancelEdit}
        onSave={handleSaveEdit}
      />

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

      {error && !editMode && (
        <div className="my-4 p-3 bg-red-950/30 border border-red-800 rounded-lg flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* 재시작 필요 안내 메시지 */}
      {!editMode && (
        <div className="my-4 p-3 bg-amber-950/30 border border-amber-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-amber-200 text-sm">
            <p className="font-medium mb-1">중요 안내</p>
            <p>
              MCP 도구 설정을 변경(추가/수정/삭제)한 후에는 변경사항을 적용하기
              위해 반드시 <strong>서비스 재시작</strong> 버튼을 눌러주세요.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        {isLoading && !editMode ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-5 w-5 text-indigo-400 animate-spin" />
            <span className="ml-2 text-gray-400">도구 목록 로드 중...</span>
          </div>
        ) : jsonMode ? (
          <JsonModeView
            servers={servers}
            isLoading={isLoading}
            error={error}
            onSave={handleJsonSave}
            onCopyJSON={copyJSON}
            setError={setError}
          />
        ) : (
          <div>
            {servers.length === 0 ? (
              <EmptyServerState />
            ) : (
              <div className="space-y-6">
                {servers.map((server, serverIdx) => (
                  <ServerCard
                    key={serverIdx}
                    server={server}
                    serverIdx={serverIdx}
                    onToggleExpanded={toggleServerExpanded}
                    onEdit={handleEditServer}
                    onDelete={handleDeleteServer}
                  />
                ))}

                <div className="flex justify-between">
                  <button
                    className="px-3 py-2 relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white text-sm flex items-center gap-1 shadow-lg shadow-purple-900/30 group"
                    onClick={handleRestartService}
                    disabled={isLoading}
                  >
                    <span className="absolute inset-0 bg-white/20 rounded-lg animate-pulse group-hover:bg-transparent"></span>
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? 'animate-spin' : 'group-hover:animate-spin'}`}
                    />
                    <span className="font-medium">서비스 재시작</span>
                  </button>

                  <button
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm flex items-center gap-1"
                    onClick={refreshServerStatus}
                    disabled={isLoading || isCheckingStatus}
                  >
                    {isCheckingStatus ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> 확인
                        중...
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
