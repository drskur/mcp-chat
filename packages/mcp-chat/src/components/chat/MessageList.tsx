import type {Component} from "solid-js";
import {createEffect, createSignal, For, Match, Switch} from "solid-js";
import type {ChatMessage} from "@/types/chat";
import {AIMessageItem} from "./AIMessageItem";
import {HumanMessageItem} from "./HumanMessageItem";

interface MessageListProps {
    messages: ChatMessage[];
    streamingMessageId?: string | null;
    streamingText?: string;
    onToolStatusChange?: (action: "approved" | "rejected") => void;
}

export const MessageList: Component<MessageListProps> = (props) => {
    const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();

    const scrollToBottom = () => {
        const container = containerRef();
        if (container) {
            // 스크롤 가능한 부모 요소 찾기
            const scrollContainer = container.closest('.overflow-y-auto');
            if (scrollContainer) {
                requestAnimationFrame(() => {
                    scrollContainer.scrollTo({
                        top: scrollContainer.scrollHeight,
                        behavior: 'smooth'
                    });
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
            class="flex flex-col gap-4 p-4 max-w-[700px] mx-auto"
        >
            <For each={props.messages}>
                {(message) => (
                    <Switch>
                        <Match when={message.role === "human"}>
                            <HumanMessageItem message={message}/>
                        </Match>
                        <Match when={message.role === "assistant"}>
                            <AIMessageItem
                                message={message}
                                isStreaming={message.id === props.streamingMessageId}
                                streamingText={message.id === props.streamingMessageId ? props.streamingText : undefined}
                                onToolStatusChange={props.onToolStatusChange}
                            />
                        </Match>
                    </Switch>
                )}
            </For>
        </div>
    );
};