import {createSignal, onMount, Show, For} from "solid-js";
import {useTitleBar} from "@/components/layout/TitleBar";
import GeneralSettings from "@/components/settings/GeneralSettings";
import McpServerSettings from "@/components/settings/McpServerSettings";
import ModelSettings from "@/components/settings/ModelSettings";
import {cn} from "@/lib/utils";
import {Settings as SettingsIcon, Server, Bot} from "lucide-solid";

interface SettingCategory {
    id: string;
    name: string;
    icon: any;
}

const categories: SettingCategory[] = [
    {id: "general", name: "일반", icon: SettingsIcon},
    {id: "mcp-servers", name: "MCP 서버", icon: Server},
    {id: "model", name: "모델", icon: Bot},
];

export default function Settings() {
    const {setTitle} = useTitleBar();
    const [activeCategory, setActiveCategory] = createSignal("general");
    const [isMobile, setIsMobile] = createSignal(false);

    onMount(() => {
        setTitle("설정");

        // Check if mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    });

    const renderActiveComponent = () => {
        switch (activeCategory()) {
            case "general":
                return <GeneralSettings/>;
            case "mcp-servers":
                return <McpServerSettings/>;
            case "model":
                return <ModelSettings/>;
            default:
                return <GeneralSettings/>;
        }
    };

    return (
        <div class="flex h-full w-full">
            <Show
                when={!isMobile()}
                fallback={
                    <div class="flex flex-col w-full">
                        {/* Mobile dropdown */}
                        <div class="p-4 border-b border-border">
                            <select
                                class="w-full p-2 rounded-md border border-input bg-background"
                                value={activeCategory()}
                                onChange={(e) => setActiveCategory(e.currentTarget.value)}
                            >
                                <For each={categories}>
                                    {(category) => (
                                        <option value={category.id}>{category.name}</option>
                                    )}
                                </For>
                            </select>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4">
                            {renderActiveComponent()}
                        </div>
                    </div>
                }
            >
                {/* Desktop layout */}
                <div class="flex w-full max-w-6xl mx-auto">
                    {/* Left navigation */}
                    <nav class="w-64 border-r border-border p-6">
                        <h2 class="text-lg font-semibold mb-4">설정</h2>
                        <ul class="space-y-1">
                            <For each={categories}>
                                {(category) => (
                                    <li>
                                        <button
                                            onClick={() => setActiveCategory(category.id)}
                                            class={cn(
                                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                                activeCategory() === category.id
                                                    ? "bg-accent text-accent-foreground font-medium"
                                                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <category.icon class="h-4 w-4"/>
                                            <span>{category.name}</span>
                                        </button>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </nav>

                    {/* Right content */}
                    <div class="flex-1 p-6 overflow-y-auto">
                        {renderActiveComponent()}
                    </div>
                </div>
            </Show>
        </div>
    );
}