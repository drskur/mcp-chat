import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plug, FileJson, Server, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MCPToolManagerProps, MCPServer } from '@/types/mcp';
import {
  getMCPServers,
  setMCPConfig,
  updateMCPConfig,
  getMCPConfig,
} from '@/app/actions/mcp/server';
import { ClientConfig } from '@langchain/mcp-adapters';
import { getUserSettings } from '@/app/actions/settings/user-settings';
import {
  EmptyServerState,
  JsonModeView,
  ServerCard,
} from '@/components/features/mcp/components';

const MCPToolManager: React.FC<MCPToolManagerProps> = ({ agentName }) => {
  const [configName, setConfigName] = useState<string>('');
  // 상태 관리
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonConfig, setJsonConfig] = useState<ClientConfig | null>(null);
  const isFetchingRef = useRef(false);

  // 도구 목록 불러오기
  const fetchTools = useCallback(async () => {
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
  }, []);

  const updateAndFetchTools = useCallback(async () => {
    if (configName) {
      await updateMCPConfig(configName);
      await fetchTools();
    }
  }, [configName, fetchTools]);

  // 초기 로드 - 현재 에이전트 이름 가져오기
  useEffect(() => {
    const initializeAgent = async () => {
      if (!agentName) {
        const userSettings = await getUserSettings();
        setConfigName(userSettings.currentAgent);
      } else {
        setConfigName(agentName);
      }
    };
    initializeAgent().catch(console.error);
  }, [agentName]);

  // configName이 설정된 후 도구 목록 갱신 및 JSON 설정 로드
  useEffect(() => {
    if (configName) {
      // JSON 설정 먼저 로드
      getMCPConfig(configName)
        .then(config => setJsonConfig(config))
        .catch(err => {
          console.error('MCP 설정 로드 오류:', err);
          setJsonConfig({ mcpServers: {} });
        });
      
      // 다음 이벤트 루프에서 실행하여 UI 렌더링 우선순위 부여
      const timeoutId = setTimeout(() => {
        updateAndFetchTools().catch(console.error);
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [configName, updateAndFetchTools]);

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

  // JSON 복사 기능 (실제 복사는 JsonModeView 내부에서 처리)
  const copyJSON = (_text: string) => {
    // JsonModeView에서 복사 성공 시 호출되는 콜백
    console.log('JSON 복사됨');
  };

  // JSON 모드 저장 핸들러
  const handleJsonSave = async (configObj: ClientConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      // 비동기 작업을 순차적으로 실행하되, UI 업데이트 기회 제공
      await setMCPConfig(configName, configObj);

      // UI가 업데이트될 수 있도록 짧은 지연 추가
      await new Promise(resolve => setTimeout(resolve, 0));

      await updateAndFetchTools();
      setJsonMode(false);
    } catch (error) {
      console.error('JSON 저장 중 오류:', error);
      setError('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-950 rounded-xl border border-gray-800 relative">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Plug className="h-5 w-5 text-indigo-400" /> MCP 도구 관리
      </h2>

      {/* JSON/서버 모드 전환 버튼 - 항상 최상위 레이어에 렌더링 */}
      <div className="absolute top-6 right-6 z-10">
        <Button
          onClick={() => {
            // 즉시 상태 변경
            setJsonMode(!jsonMode);
          }}
          variant="ghost"
          className="text-xs px-2 py-1 h-auto bg-gray-800 text-gray-300 hover:bg-gray-700"
          type="button"
        >
          {jsonMode ? (
            <>
              <Server className="h-3 w-3 mr-1" />
              서버 모드
            </>
          ) : (
            <>
              <FileJson className="h-3 w-3 mr-1" />
              JSON 모드
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="my-4 p-3 bg-red-950/30 border border-red-800 rounded-lg flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-6">
        {jsonMode ? (
          <JsonModeView
            isLoading={isLoading}
            error={error}
            onSave={handleJsonSave}
            onCopyJSON={copyJSON}
            setError={setError}
            initialConfig={jsonConfig}
            configName={configName}
          />
        ) : (
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-5 w-5 text-indigo-400 animate-spin" />
                <span className="ml-2 text-gray-400">도구 목록 로드 중...</span>
              </div>
            ) : servers.length === 0 ? (
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
