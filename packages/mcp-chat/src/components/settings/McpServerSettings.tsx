import { type Component, createSignal, For } from "solid-js";
import { Plus, Trash2 } from "lucide-solid";
import { Button } from "@/components/ui/button";

interface McpServer {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
}

const McpServerSettings: Component = () => {
    const [servers, setServers] = createSignal<McpServer[]>([
        { id: "1", name: "Local MCP Server", url: "http://localhost:3001", enabled: true },
        { id: "2", name: "Development Server", url: "http://dev.example.com:3001", enabled: false },
    ]);

    const addServer = () => {
        const newServer: McpServer = {
            id: crypto.randomUUID(),
            name: "새 MCP 서버",
            url: "",
            enabled: false,
        };
        setServers([...servers(), newServer]);
    };

    const removeServer = (id: string) => {
        setServers(servers().filter(server => server.id !== id));
    };

    const toggleServer = (id: string) => {
        setServers(servers().map(server => 
            server.id === id ? { ...server, enabled: !server.enabled } : server
        ));
    };

    return (
        <div class="space-y-6">
            <div>
                <h2 class="text-xl font-semibold mb-4">MCP 서버 설정</h2>
                <p class="text-sm text-muted-foreground mb-6">
                    Model Context Protocol 서버를 관리합니다. 활성화된 서버의 도구를 대화에서 사용할 수 있습니다.
                </p>

                <div class="space-y-4">
                    <For each={servers()}>
                        {(server) => (
                            <div class="rounded-lg border border-border p-4">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex-1">
                                        <input
                                            type="text"
                                            value={server.name}
                                            placeholder="서버 이름"
                                            class="font-medium text-base bg-transparent border-none outline-none w-full"
                                            onInput={(e) => {
                                                const newName = e.currentTarget.value;
                                                setServers(servers().map(s => 
                                                    s.id === server.id ? { ...s, name: newName } : s
                                                ));
                                            }}
                                        />
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={server.enabled}
                                                onChange={() => toggleServer(server.id)}
                                                class="sr-only peer"
                                            />
                                            <div class="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeServer(server.id)}
                                        >
                                            <Trash2 class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <input
                                    type="url"
                                    value={server.url}
                                    placeholder="서버 URL (예: http://localhost:3001)"
                                    class="w-full p-2 rounded-md border border-input bg-background text-sm"
                                    onInput={(e) => {
                                        const newUrl = e.currentTarget.value;
                                        setServers(servers().map(s => 
                                            s.id === server.id ? { ...s, url: newUrl } : s
                                        ));
                                    }}
                                />
                            </div>
                        )}
                    </For>

                    <Button onClick={addServer} variant="outline" class="w-full">
                        <Plus class="h-4 w-4 mr-2" />
                        서버 추가
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default McpServerSettings;