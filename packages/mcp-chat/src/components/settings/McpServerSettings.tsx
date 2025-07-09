import {FileText, RefreshCw} from "lucide-solid";
import {type Component, createSignal, For, Show, Signal, Accessor} from "solid-js";
import type {MCPServerStatus} from "@/types/mcp";
import {Button} from "@/components/ui/button";
import McpServerCard from "./McpServerCard";

interface McpServerSettingsProps {
    serverStatus: Accessor<MCPServerStatus[] | undefined>;
    mcpServerConfig: Record<string, unknown> | undefined;
    onConfigChange: (config: Record<string, unknown>) => Promise<void>;
    onRefresh: () => Promise<void>;
    onEditStart: (config: Record<string, unknown>) => void;
    onJsonEditorOpen: () => void;
    isEditing: boolean;
    isLoading?: boolean;
}

const McpServerSettings: Component<McpServerSettingsProps> = (props) => {
    const [isRefreshing, setIsRefreshing] = createSignal(false);

    const openJsonEditor = () => {
        props.onEditStart(props.mcpServerConfig ?? {});
        props.onJsonEditorOpen();
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await props.onRefresh();
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
                            <FileText class="h-4 w-4 mr-2"/>
                            JSON 편집
                        </Button>
                    </div>

                    <Show
                        when={props.isLoading}
                        fallback={
                            <Show
                                when={props.serverStatus() && (props.serverStatus() ?? []).length > 0}
                                fallback={
                                    <div class="rounded-lg border border-border p-6 text-center">
                                        <p class="text-sm text-muted-foreground">
                                            설정된 MCP 서버가 없습니다.
                                        </p>
                                    </div>
                                }
                            >
                                <For each={props.serverStatus()}>
                                    {(server) => <McpServerCard server={server}/>}
                                </For>
                            </Show>
                        }
                    >
                        <div class="rounded-lg border border-border p-6 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <RefreshCw class="h-4 w-4 animate-spin"/>
                                <p class="text-sm text-muted-foreground">
                                    서버 상태를 불러오는 중...
                                </p>
                            </div>
                        </div>
                    </Show>
                </div>
            </div>
        </div>
    );
};

export default McpServerSettings;
