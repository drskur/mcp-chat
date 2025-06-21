import type { Component } from "solid-js";
import { Match, Switch } from "solid-js";
import type { ErrorBlock, MessageBlock, TextBlock } from "@/types/chat";

interface TextBlockProps {
    block: TextBlock;
}

const TextBlockContent: Component<TextBlockProps> = (props) => {
    return (
        <div class="whitespace-pre-wrap text-justify prose prose-stone">
            {props.block.content}
        </div>
    );
};

interface ErrorBlockProps {
    block: ErrorBlock;
}

const ErrorBlockContent: Component<ErrorBlockProps> = (props) => {
    const isUserAbort = props.block.content.toLowerCase().includes('abort');

    return (
        <Switch>
            <Match when={isUserAbort}>
                <div class="border border-red-200 bg-red-50 p-3 rounded-md mt-4">
                    <div class="whitespace-pre-wrap">
                        사용자가 요청을 취소했습니다.
                    </div>
                </div>
            </Match>
            <Match when={true}>
                <div class="border border-red-200 bg-red-50 p-3 rounded-md">
                    <div class="text-red-800 text-sm whitespace-pre-wrap">
                        {props.block.content}
                    </div>
                </div>
            </Match>
        </Switch>

    );
};

interface BlockContentProps {
    block: MessageBlock;
}

export const BlockContent: Component<BlockContentProps> = (props) => {
    return (
        <Switch>
            <Match when={props.block.type === "text"}>
                <TextBlockContent block={props.block as TextBlock} />
            </Match>
            <Match when={props.block.type === "error"}>
                <ErrorBlockContent block={props.block as ErrorBlock} />
            </Match>
            <Match when={true}>
                <div class="text-xs text-muted-foreground">
                    [{props.block.type}] 블록
                </div>
            </Match>
        </Switch>
    );
};