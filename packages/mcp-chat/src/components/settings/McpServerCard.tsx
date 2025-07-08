import { Buffer } from "buffer";
import { ChevronDown, ChevronUp, ExternalLink, Wrench } from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";
import type { MCPServerStatus } from "@/types/mcp";

interface McpServerCardProps {
  server: MCPServerStatus;
}

const McpServerCard: Component<McpServerCardProps> = (props) => {
  const [isCollapsed, setIsCollapsed] = createSignal(
    props.server.collapse ?? false,
  );

  return (
    <div class="rounded-lg border border-border p-4">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="font-medium text-base">{props.server.name}</h3>
          <div class="flex items-center justify-between mt-1">
            <div class="flex items-center gap-2">
              <div
                class={`w-2 h-2 rounded-full ${
                  props.server.connectionStatus.success
                    ? "bg-green-500"
                    : props.server.connectionStatus.isPending
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              ></div>
              <span class="text-sm text-muted-foreground capitalize">
                {props.server.connectionStatus.success
                  ? "online"
                  : props.server.connectionStatus.isPending
                    ? "auth required"
                    : "offline"}
              </span>
              {isCollapsed() && props.server.tools.length > 0 && (
                <span class="text-sm text-muted-foreground">
                  • {props.server.tools.length}개 도구
                </span>
              )}
            </div>
            <Show
              when={
                props.server.connectionStatus.isPending &&
                props.server.connectionStatus.authUrl
              }
            >
              <button
                onClick={() => {
                  // 버튼 클릭 시점에 새로운 timestamp로 state 업데이트
                  const authUrl = new URL(props.server.connectionStatus.authUrl!);
                  const stateData = {
                    serverName: props.server.name,
                    timestamp: Date.now(),
                  };
                  const encodedState = Buffer.from(
                    JSON.stringify(stateData),
                  ).toString("base64");
                  authUrl.searchParams.set("state", encodedState);
                  window.open(authUrl.toString(), "_blank");
                }}
                class="inline-flex items-center gap-1 px-3 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors"
              >
                <ExternalLink class="h-3 w-3" />
                통합
              </button>
            </Show>
          </div>
          <Show
            when={
              !props.server.connectionStatus.success &&
              !props.server.connectionStatus.isPending &&
              props.server.connectionStatus.error
            }
          >
            <p class="text-xs text-muted-foreground mt-1 ml-4">
              {props.server.connectionStatus.error}
            </p>
          </Show>
        </div>
        {props.server.tools.length > 0 && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed())}
            class="p-1 hover:bg-muted rounded transition-colors"
            aria-label={isCollapsed() ? "Expand" : "Collapse"}
          >
            <Show when={isCollapsed()} fallback={<ChevronUp class="h-4 w-4" />}>
              <ChevronDown class="h-4 w-4" />
            </Show>
          </button>
        )}
      </div>
      <Show when={!isCollapsed() && props.server.tools.length > 0}>
        <div class="mt-3">
          <h4 class="text-sm font-medium mb-2">사용 가능한 도구:</h4>
          <div class="grid grid-cols-2 gap-3">
            <For each={props.server.tools}>
              {(tool) => (
                <div class="space-y-1 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-default">
                  <div class="flex items-center gap-2">
                    <Wrench class="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span class="text-sm font-medium truncate">
                      {tool.name}
                    </span>
                  </div>
                  {tool.description && (
                    <p
                      class="text-xs text-muted-foreground ml-5 line-clamp-2"
                      title={tool.description}
                    >
                      {tool.description}
                    </p>
                  )}
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default McpServerCard;
