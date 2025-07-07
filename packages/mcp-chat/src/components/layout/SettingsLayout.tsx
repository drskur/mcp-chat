import {Bot, Server, Settings as SettingsIcon} from "lucide-solid";
import {type Component, type JSX, createSignal, For, onMount, Show} from "solid-js";
import {cn} from "@/lib/utils";
import {A, useLocation} from "@solidjs/router";

interface SettingCategory {
    id: string;
    name: string;
    icon: any;
    path: string;
}

const categories: SettingCategory[] = [
    {id: "general", name: "일반", icon: SettingsIcon, path: "/settings"},
    {id: "mcp-servers", name: "MCP 서버", icon: Server, path: "/settings/mcp-servers"},
    {id: "model", name: "모델", icon: Bot, path: "/settings/model"},
];

interface SettingsLayoutProps {
    children: JSX.Element;
}

const SettingsLayout: Component<SettingsLayoutProps> = (props) => {
    const [isMobile, setIsMobile] = createSignal(false);
    const location = useLocation();

    // 현재 경로에 따라 활성 카테고리 결정
    const activeCategory = () => {
        const path = location.pathname;
        const category = categories.find(cat => cat.path === path);
        return category ? category.id : "general";
    };

    onMount(() => {
        // Check if mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => {
            window.removeEventListener("resize", checkMobile);
        };
    });

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
                                onChange={(e) => {
                                    const categoryId = e.currentTarget.value;
                                    const category = categories.find(cat => cat.id === categoryId);
                                    if (category) {
                                        window.location.href = category.path;
                                    }
                                }}
                            >
                                <For each={categories}>
                                    {(category) => (
                                        <option value={category.id}>{category.name}</option>
                                    )}
                                </For>
                            </select>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4">
                            {props.children}
                        </div>
                    </div>
                }
            >
                {/* Desktop layout */}
                <div class="flex w-full max-w-6xl mx-auto">
                    {/* Left navigation */}
                    <nav class="w-64 p-6">
                        <ul class="space-y-1">
                            <For each={categories}>
                                {(category) => (
                                    <li>
                                        <A
                                            href={category.path}
                                            class={cn(
                                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                                activeCategory() === category.id
                                                    ? "bg-accent text-accent-foreground font-medium"
                                                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <category.icon class="h-4 w-4"/>
                                            <span>{category.name}</span>
                                        </A>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </nav>

                    {/* Right content */}
                    <div class="flex-1 p-6">
                        {props.children}
                    </div>
                </div>
            </Show>
        </div>
    );
};

export default SettingsLayout;