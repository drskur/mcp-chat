import {A} from "@solidjs/router";
import {PanelLeft, Plus, Settings} from "lucide-solid";
import {type Component, createSignal, onCleanup, onMount } from "solid-js";
import {isServer} from "solid-js/web";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

const Sidebar: Component = () => {
    const [isOpen, setIsOpen] = createSignal(true);
    const [isMobile, setIsMobile] = createSignal(false);

    const checkScreenSize = () => {
        if (!isServer) {
            const mobile = window.innerWidth < 1000;
            setIsMobile(mobile);
            // Auto-close sidebar on mobile
            if (mobile) {
                setIsOpen(false);
            } else {
                setIsOpen(true);
            }
        }
    };

    onMount(() => {
        checkScreenSize();
        if (!isServer) {
            window.addEventListener("resize", checkScreenSize);
        }
    });

    onCleanup(() => {
        if (!isServer) {
            window.removeEventListener("resize", checkScreenSize);
        }
    });

    const toggleSidebar = () => {
        setIsOpen(!isOpen());
    };

    return (
        <>
            {/* Menu button - always visible */}
            <Button
                onClick={toggleSidebar}
                class="fixed top-[12px] left-4 z-50"
                variant="ghost"
                size="icon"
            >
                <PanelLeft class="h-4 w-4"/>
            </Button>

            {/* Overlay for mobile */}
            {isOpen() && isMobile() && (
                <div
                    class="fixed inset-0 bg-black/50 z-40"
                    onClick={toggleSidebar}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                class={cn(
                    "fixed top-0 left-0 h-full bg-sidebar border-r border-sidebar-border transition-transform duration-300 z-40 flex flex-col",
                    "w-72",
                    isOpen() ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Sidebar Header */}
                <div class="flex items-center justify-between p-4">
                    <div class="flex items-center gap-3 ml-12">
                        {/* App Name */}
                        <h1 class="text-lg font-semibold">MCP Chat</h1>
                    </div>
                </div>

                {/* Sidebar Content */}
                <div class="flex-1 overflow-y-auto p-4">
                    {/* New Chat Button */}
                    <A
                        href="/"
                        class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    >
                        <Plus class="h-4 w-4" />
                        <span class="text-sm font-medium">새 채팅</span>
                    </A>

                    {/* Chat History will go here */}
                    <div class="mt-4">
                        <p class="text-xs text-sidebar-primary/60 px-3 mb-2">최근 채팅</p>
                        {/* Chat list will be added later */}
                    </div>
                </div>

                {/* Settings button at bottom */}
                <div class="border-t border-sidebar-border p-4">
                    <A
                        href={"/settings"}
                        class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    >
                        <Settings class="h-4 w-4" />
                        <span class="text-sm font-medium">설정</span>
                    </A>
                </div>
            </aside>

            {/* Main content margin adjustment */}
            <div
                class={cn(
                    "transition-all duration-300",
                    isOpen() && !isMobile() ? "ml-72" : "ml-0"
                )}
            />
        </>
    );
};

export default Sidebar;