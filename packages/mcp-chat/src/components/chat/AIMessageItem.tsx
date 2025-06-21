import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import type { ChatMessage } from "@/types/chat";
import { BlockContent } from "./BlockContent";

interface MessageItemProps {
    message: ChatMessage;
    isStreaming: boolean;
}

export const AIMessageItem: Component<MessageItemProps> = (props) => {
    // AI 메시지 렌더링
    return (
        <div class="flex w-full justify-start">
            <div class="max-w-[80%] rounded-lg p-4 text-sm bg-muted mr-4">
                <Show when={props.message.blocks.length > 0}>
                    <For each={props.message.blocks}>
                        {(block) => <BlockContent block={block} />}
                    </For>
                </Show>

                <Show when={props.isStreaming && props.message.blocks.length === 0}>
                    <div class="flex items-center gap-2 text-muted-foreground">
                        <div class="animate-pulse">AI가 응답 중입니다...</div>
                    </div>
                </Show>
            </div>
        </div>
    );
};