import { cn } from "@/lib/utils";
import type { Component, JSX } from "solid-js";
import { ChatInput } from "./ChatInput";

interface ChatSessionProps {
    class?: string;
    children?: JSX.Element;
}

export const ChatSession: Component<ChatSessionProps> = (props) => {
    return (
        <div
            class={cn(
                "flex flex-col h-screen w-full",
                props.class
            )}
        >
            {/* Chat Messages Area */}
            <div class="flex-1 overflow-y-auto p-4">
                {props.children || (
                    <div class="flex items-center justify-center h-full text-muted-foreground">
                        새로운 채팅을 시작하세요
                    </div>
                )}
            </div>

            {/* Chat Input Area */}
            <div class="p-4 flex justify-center">
                <ChatInput />
            </div>
        </div>
    );
};