import type {Component} from "solid-js";
import {For, Show} from "solid-js";
import type {ChatMessage, ToolUseBlock} from "@/types/chat";
import {BlockContent} from "./BlockContent";

interface MessageItemProps {
    message: ChatMessage;
    isStreaming: boolean;
    streamingText?: string;
    onToolStatusChange?: (toolUseBlock: ToolUseBlock, status: "approved" | "rejected") => void;
}

export const AIMessageItem: Component<MessageItemProps> = (props) => {
    // AI 메시지 렌더링
    return (
        <div class="flex w-full justify-start">
            <div class="w-full p-4 text-sm">
                <Show when={props.message.blocks.length > 0}>
                    <For each={props.message.blocks}>
                        {(block) => <BlockContent block={block} onToolStatusChange={props.onToolStatusChange}/>}
                    </For>
                </Show>

                <Show when={props.isStreaming && props.streamingText}>
                    <div class="whitespace-pre-wrap break-words prose prose-stone">
                        {props.streamingText}
                        <span class="inline-block w-2 h-4 bg-foreground/70 animate-pulse ml-1"/>
                    </div>
                </Show>

                <Show when={props.isStreaming && !props.streamingText && props.message.blocks.length === 0}>
                    <div class="flex items-center gap-2 text-muted-foreground">
                        <div class="animate-pulse">AI가 응답 중입니다...</div>
                    </div>
                </Show>
            </div>
        </div>
    );
};