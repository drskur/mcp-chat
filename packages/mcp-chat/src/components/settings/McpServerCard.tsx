import {ChevronDown, ChevronUp, Wrench} from "lucide-solid";
import {type Component, createSignal, For, Show} from "solid-js";
import type {MCPServerStatus} from "@/types/mcp";

interface McpServerCardProps {
    server: MCPServerStatus;
}

const McpServerCard: Component<McpServerCardProps> = (props) => {
    const [isCollapsed, setIsCollapsed] = createSignal(props.server.collapse ?? false);

    return (
        <div class="rounded-lg border border-border p-4">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <h3 class="font-medium text-base">{props.server.name}</h3>
                    <div class="flex items-center gap-2 mt-1">
                        <div
                            class={`w-2 h-2 rounded-full ${props.server.status === "online" ? "bg-green-500" : "bg-red-500"}`}>
                        </div>
                        <span class="text-sm text-muted-foreground capitalize">{props.server.status}</span>
                        {isCollapsed() && props.server.tools.length > 0 && (
                            <span class="text-sm text-muted-foreground">
                                • {props.server.tools.length}개 도구
                            </span>
                        )}
                    </div>
                    <Show when={props.server.status === "offline" && props.server.error}>
                        <p class="text-xs text-muted-foreground mt-1 ml-4">
                            {props.server.error}
                        </p>
                    </Show>
                </div>
                {props.server.tools.length > 0 && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed())}
                        class="p-1 hover:bg-muted rounded transition-colors"
                        aria-label={isCollapsed() ? "Expand" : "Collapse"}
                    >
                        <Show when={isCollapsed()} fallback={<ChevronUp class="h-4 w-4"/>}>
                            <ChevronDown class="h-4 w-4"/>
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
                                        <span class="text-sm font-medium truncate">{tool.name}</span>
                                    </div>
                                    {tool.description && (
                                        <p class="text-xs text-muted-foreground ml-5 line-clamp-2" title={tool.description}>
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