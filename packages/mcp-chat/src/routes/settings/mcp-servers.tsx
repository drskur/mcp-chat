import { onMount, createSignal } from "solid-js";
import {useAction} from "@solidjs/router";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { useTitleBar } from "@/components/layout/TitleBar";
import McpServerSettings from "@/components/settings/McpServerSettings";
import McpServerJsonEditor from "@/components/settings/McpServerJsonEditor";
import {
  getMCPServerConfigQuery, getMCPServerStatusQuery,
  refreshMCPServerStatusAction,
  setMCPConfigAction,
} from "@/actions/mcp";
import {MCPServerStatus} from "@/types/mcp";

export default function McpServersSettings() {
  const { setTitle } = useTitleBar();

  // 로컬 상태 관리
  const [serverStatus, setServerStatus] = createSignal<MCPServerStatus[] | undefined>();
  const [mcpServerConfig, setMcpServerConfig] = createSignal<Record<string, unknown> | undefined>();
  const [localConfig, setLocalConfig] = createSignal<Record<string, unknown> | null>(null);
  const [isEditing, setIsEditing] = createSignal(false);
  const [showJsonEditor, setShowJsonEditor] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);

  const setMCPConfig = useAction(setMCPConfigAction);
  const refreshServerStatusAction = useAction(refreshMCPServerStatusAction);

  // 데이터 로드 함수들
  const loadServerStatus = async () => {
    try {
      const status = await getMCPServerStatusQuery();
      setServerStatus(status);
    } catch (error) {
      console.error("Failed to load server status:", error);
      setServerStatus([]);
    }
  };

  const loadServerConfig = async () => {
    try {
      const config = await getMCPServerConfigQuery();
      setMcpServerConfig(config);
    } catch (error) {
      console.error("Failed to load server config:", error);
      setMcpServerConfig({});
    }
  };

  onMount(async () => {
    console.log('=== MCP Settings Page - onMount started ===');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', window.location.search);

    setTitle("설정");
    setIsLoading(true);

    try {
      // OAuth 성공 파라미터 확인
      const urlParams = new URLSearchParams(window.location.search);
      const authResult = urlParams.get('auth');
      const serverName = urlParams.get('server');

      console.log('Page loaded, URL params:', { auth: authResult, server: serverName });

      if (authResult === 'success' && serverName) {
        console.log(`🎉 OAuth success detected for server: ${serverName}, refreshing status`);
        // OAuth 성공 후 서버 상태 캐시 무효화 및 새로고침
        await handleRefresh()

        // URL 파라미터 정리 (브라우저 히스토리에서 제거)
        window.history.replaceState({}, '', '/settings/mcp-servers');
        console.log('✅ URL params cleaned up and server status refreshed');
      } else {
        console.log('Regular page load, loading initial data');
        // 일반적인 페이지 로드
        await Promise.all([loadServerStatus(), loadServerConfig()]);
      }
    } finally {
      setIsLoading(false);
      console.log('=== MCP Settings Page - onMount completed ===');
    }
  });

  const handleMCPConfig = async (config: Record<string, unknown>) => {
    await setMCPConfig(config);
    setLocalConfig(null);
    setIsEditing(false);
    setShowJsonEditor(false);
    await Promise.all([loadServerStatus(), loadServerConfig()]);
  };

  const handleRefresh = async () => {
    await refreshServerStatusAction();
    await Promise.all([loadServerStatus(), loadServerConfig()]);
  };

  return (
    <SettingsLayout>
      <McpServerSettings
        serverStatus={serverStatus}
        mcpServerConfig={localConfig() ?? mcpServerConfig()}
        onConfigChange={handleMCPConfig}
        onRefresh={handleRefresh}
        onEditStart={(config: Record<string, unknown>) => {
          setLocalConfig(config);
          setIsEditing(true);
        }}
        onJsonEditorOpen={() => {
          setShowJsonEditor(true);
        }}
        isEditing={isEditing()}
        isLoading={isLoading()}
      />

      <McpServerJsonEditor
        open={showJsonEditor()}
        onOpenChange={setShowJsonEditor}
        mcpServers={localConfig() ?? mcpServerConfig()}
        onConfigChange={handleMCPConfig}
      />
    </SettingsLayout>
  );
}
