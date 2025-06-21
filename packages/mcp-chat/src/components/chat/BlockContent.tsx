import type { Component } from "solid-js";
import { Show } from "solid-js";
import type { MessageBlock, TextBlock } from "@/types/chat";

interface BlockContentProps {
    block: MessageBlock;
}

export const BlockContent: Component<BlockContentProps> = (props) => {
    return (
        <Show when={props.block.type === "text"} fallback={
            <div class="text-xs text-muted-foreground">
                [{props.block.type}] 블록
            </div>
        }>
            <div class="whitespace-pre-wrap">
                {(props.block as TextBlock).content}
            </div>
        </Show>
    );
};