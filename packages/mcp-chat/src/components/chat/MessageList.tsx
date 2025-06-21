import type { Component } from "solid-js";
import { createEffect, createSignal, For, Match, Switch } from "solid-js";
import type { ChatMessage } from "@/types/chat";
import { AIMessageItem } from "./AIMessageItem";
import { HumanMessageItem } from "./HumanMessageItem";

interface MessageListProps {
    messages: ChatMessage[];
    streamingMessageId?: string | null;
    streamingText?: string;
}

export const MessageList: Component<MessageListProps> = (props) => {
    const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();

    const scrollToBottom = () => {
        const container = containerRef();
        if (container) {
            // 스크롤 가능한 부모 요소 찾기
            const scrollContainer = container.closest('.overflow-y-auto');
            if (scrollContainer) {
                console.log('scrollHeight:', scrollContainer.scrollHeight, 'clientHeight:', scrollContainer.clientHeight, 'scrollTop:', scrollContainer.scrollTop);
                requestAnimationFrame(() => {
                    scrollContainer.scrollTo({
                        top: scrollContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                    console.log('after scroll - scrollTop:', scrollContainer.scrollTop);
                });
            }
        }
    };

    // 메시지 변경 시 스크롤
    createEffect(() => {
        scrollToBottom();
    });

    // 스트리밍 텍스트 변경 시 스크롤
    createEffect(() => {
        if (props.streamingText) {
            scrollToBottom();
        }
    });

    return (
        <div
            ref={setContainerRef}
            class="flex flex-col gap-4 p-4 max-w-3xl mx-auto"
        >
            <For each={props.messages}>
                {(message) => (
                    <Switch>
                        <Match when={message.role === "human"}>
                            <HumanMessageItem message={message} />
                        </Match>
                        <Match when={message.role === "assistant"}>
                            <AIMessageItem
                                message={message}
                                isStreaming={message.id === props.streamingMessageId}
                                streamingText={message.id === props.streamingMessageId ? props.streamingText : undefined}
                            />
                        </Match>
                    </Switch>
                )}
            </For>
        </div>
    );
};