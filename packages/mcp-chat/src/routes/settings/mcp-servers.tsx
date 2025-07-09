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
    setTitle("설정");
    setIsLoading(true);
    try {
      await Promise.all([loadServerStatus(), loadServerConfig()]);
    } finally {
      setIsLoading(false);
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
