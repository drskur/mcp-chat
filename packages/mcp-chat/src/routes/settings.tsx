import {Bot, Server, Settings as SettingsIcon} from "lucide-solid";
import {createSignal, For, onMount, Show} from "solid-js";
import {useTitleBar} from "@/components/layout/TitleBar";
import GeneralSettings from "@/components/settings/GeneralSettings";
import McpServerSettings from "@/components/settings/McpServerSettings";
import ModelSettings from "@/components/settings/ModelSettings";
import {cn} from "@/lib/utils";

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


    // 해시 기반 라우팅을 위한 함수들
    const getHashCategory = () => {
        const hash = window.location.hash.slice(1);
        return categories.find(cat => cat.id === hash) ? hash : "general";
    };

    const updateHash = (categoryId: string) => {
        window.history.pushState(null, "", `#${categoryId}`);
    };

    onMount(() => {
        setTitle("설정");

        // 초기 해시에서 카테고리 설정
        setActiveCategory(getHashCategory());

        // Check if mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);

        // 해시 변경 감지
        const handleHashChange = () => {
            setActiveCategory(getHashCategory());
        };
        window.addEventListener("hashchange", handleHashChange);

        return () => {
            window.removeEventListener("resize", checkMobile);
            window.removeEventListener("hashchange", handleHashChange);
        };
    });

    // 카테고리 변경 시 해시 업데이트
    const handleCategoryChange = (categoryId: string) => {
        setActiveCategory(categoryId);
        updateHash(categoryId);
    };


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
                                onChange={(e) => handleCategoryChange(e.currentTarget.value)}
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
                        <ul class="space-y-1">
                            <For each={categories}>
                                {(category) => (
                                    <li>
                                        <button
                                            onClick={() => handleCategoryChange(category.id)}
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