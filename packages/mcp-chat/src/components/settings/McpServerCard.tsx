import {type Component, For, createSignal, Show} from "solid-js";
import {ChevronDown, ChevronRight} from "lucide-solid";
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
                    <div class="flex items-center gap-2">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed())}
                            class="p-0.5 hover:bg-muted rounded transition-colors"
                            aria-label={isCollapsed() ? "Expand" : "Collapse"}
                        >
                            <Show when={isCollapsed()} fallback={<ChevronDown class="h-4 w-4" />}>
                                <ChevronRight class="h-4 w-4" />
                            </Show>
                        </button>
                        <h3 class="font-medium text-base">{props.server.name}</h3>
                    </div>
                    <div class="flex items-center gap-2 mt-1 ml-6">
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
                </div>
            </div>
            <Show when={!isCollapsed() && props.server.tools.length > 0}>
                <div class="mt-3 ml-6">
                    <h4 class="text-sm font-medium mb-2">사용 가능한 도구:</h4>
                    <div class="space-y-1">
                        <For each={props.server.tools}>
                            {(tool) => (
                                <div class="text-sm">
                                    <span class="font-medium">{tool.name}</span>
                                    {tool.description && (
                                        <span class="text-muted-foreground ml-2">- {tool.description}</span>
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