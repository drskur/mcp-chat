import type {Component} from "solid-js";
import {Match, Switch} from "solid-js";
import type {ErrorBlock, MessageBlock, TextBlock, ToolUseBlock, ToolResultBlock} from "@/types/chat";
import {TextBlockContent} from "./contents/TextBlockContent";
import {ErrorBlockContent} from "./contents/ErrorBlockContent";
import {ToolUseBlockContent} from "./contents/ToolUseBlockContent";
import {ToolResultBlockContent} from "./contents/ToolResultBlockContent";

interface BlockContentProps {
    block: MessageBlock;
    onToolStatusChange?: (blockId: string, status: "approved" | "rejected") => void;
}

export const BlockContent: Component<BlockContentProps> = (props) => {
    return (
        <Switch>
            <Match when={props.block.type === "text"}>
                <TextBlockContent block={props.block as TextBlock}/>
            </Match>
            <Match when={props.block.type === "error"}>
                <ErrorBlockContent block={props.block as ErrorBlock}/>
            </Match>
            <Match when={props.block.type === "tool_use"}>
                <ToolUseBlockContent 
                    block={props.block as ToolUseBlock}
                    onStatusChange={(status) => props.onToolStatusChange?.(props.block.id, status)}
                />
            </Match>
            <Match when={props.block.type === "tool_result"}>
                <ToolResultBlockContent block={props.block as ToolResultBlock}/>
            </Match>
            <Match when={true}>
                <div class="text-xs text-muted-foreground">
                    [{props.block.type}] 블록
                </div>
            </Match>
        </Switch>
    );
};