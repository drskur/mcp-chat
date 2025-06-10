import React, { useState, useEffect, useRef } from 'react';
import { Plug, FileJson, Server, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MCPToolManagerProps, MCPServer, ServerConfig } from '@/types/mcp';
import { JsonModeView, ServerCard, EmptyServerState } from '@/components/mcp';
import { getMCPServers } from '@/app/actions/mcp/server';

const MCPToolManager: React.FC<MCPToolManagerProps> = ({
  onSettingsChanged,
}) => {
  // 상태 관리
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const isFetchingRef = useRef(false);

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

  // 초기 로드 및 주기적 갱신
  useEffect(() => {
    fetchTools().catch(console.error);
  }, []);

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

  return (
    <div className="p-6 bg-gray-950 rounded-xl border border-gray-800 relative">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Plug className="h-5 w-5 text-indigo-400" /> MCP 도구 관리
      </h2>

      {!jsonMode && (
        <Button
          onClick={() => setJsonMode(true)}
          variant="ghost"
          className="absolute top-6 right-6 text-xs px-2 py-1 h-auto bg-gray-800 text-gray-300 hover:bg-gray-700"
        >
          <FileJson className="h-3 w-3 mr-1" />
          JSON 모드
        </Button>
      )}

      {jsonMode && (
        <Button
          onClick={() => setJsonMode(false)}
          variant="ghost"
          className="absolute top-6 right-6 text-xs px-2 py-1 h-auto bg-gray-800 text-gray-300 hover:bg-gray-700"
        >
          <Server className="h-3 w-3 mr-1" />
          서버 모드
        </Button>
      )}

      {error && (
        <div className="my-4 p-3 bg-red-950/30 border border-red-800 rounded-lg flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-5 w-5 text-indigo-400 animate-spin" />
            <span className="ml-2 text-gray-400">도구 목록 로드 중...</span>
          </div>
        ) : jsonMode ? (
          <JsonModeView
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
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MCPToolManager;
