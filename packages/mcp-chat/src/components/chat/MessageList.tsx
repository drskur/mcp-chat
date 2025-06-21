import type { Component } from "solid-js";
import { For, Switch, Match } from "solid-js";
import type { ChatMessage } from "@/types/chat";
import { AIMessageItem } from "./AIMessageItem";
import { HumanMessageItem } from "./HumanMessageItem";

interface MessageListProps {
    messages: ChatMessage[];
    streamingMessageId?: string | null;
}

export const MessageList: Component<MessageListProps> = (props) => {
    return (
        <div class="flex flex-col gap-4 p-4 max-w-3xl mx-auto">
            <For each={props.messages}>
                {(message) => (
                    <Switch>
                        <Match when={message.role === "human"}>
                            <div class="flex w-full justify-start">
                                <div class="w-full">
                                    <HumanMessageItem message={message} />
                                </div>
                            </div>
                        </Match>
                        <Match when={message.role === "assistant"}>
                            <AIMessageItem
                                message={message}
                                isStreaming={message.id === props.streamingMessageId}
                            />
                        </Match>
                    </Switch>
                )}
            </For>
        </div>
    );
};