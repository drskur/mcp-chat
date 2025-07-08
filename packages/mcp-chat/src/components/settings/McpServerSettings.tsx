import { createAsync, useAction } from "@solidjs/router";
import { FileText, RefreshCw } from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";
import {
  getMCPServerConfigQuery,
  getMCPServerStatusQuery,
  refreshMCPServerStatusAction,
  setMCPConfigAction,
} from "@/actions/mcp";
import { Button } from "@/components/ui/button";
import McpServerCard from "./McpServerCard";
import McpServerJsonEditor from "./McpServerJsonEditor";

const McpServerSettings: Component = () => {
  const serverStatus = createAsync(() => getMCPServerStatusQuery());
  const mcpServerConfig = createAsync(() => getMCPServerConfigQuery());
  const setMCPConfig = useAction(setMCPConfigAction);
  const refreshServerStatus = useAction(refreshMCPServerStatusAction);

  const [showJsonEditor, setShowJsonEditor] = createSignal(false);
  const [isRefreshing, setIsRefreshing] = createSignal(false);

  const openJsonEditor = () => {
    setShowJsonEditor(true);
  };

  const handleMCPConfig = async (config: Record<string, unknown>) => {
    await setMCPConfig(config);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshServerStatus();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-semibold mb-4">MCP 서버</h2>
        <p class="text-sm text-muted-foreground mb-6">
          Model Context Protocol 서버를 관리합니다. 활성화된 서버의 도구를
          대화에서 사용할 수 있습니다.
        </p>

        <div class="space-y-4">
          <div class="flex justify-end gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={isRefreshing()}
            >
              <RefreshCw
                class={`h-4 w-4 mr-2 ${isRefreshing() ? "animate-spin" : ""}`}
              />
              새로고침
            </Button>
            <Button onClick={openJsonEditor} variant="outline">
              <FileText class="h-4 w-4 mr-2" />
              JSON 편집
            </Button>
          </div>

          <Show
            when={serverStatus() && (serverStatus() ?? []).length > 0}
            fallback={
              <div class="rounded-lg border border-border p-6 text-center">
                <p class="text-sm text-muted-foreground">
                  설정된 MCP 서버가 없습니다.
                </p>
              </div>
            }
          >
            <For each={serverStatus()}>
              {(server) => <McpServerCard server={server} />}
            </For>
          </Show>
        </div>
      </div>

      <McpServerJsonEditor
        open={showJsonEditor()}
        onOpenChange={setShowJsonEditor}
        mcpServers={mcpServerConfig()}
        onConfigChange={handleMCPConfig}
      />
    </div>
  );
};

export default McpServerSettings;
