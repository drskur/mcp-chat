import type {Component} from "solid-js";
import {Match, Switch} from "solid-js";
import type {ErrorBlock, MessageBlock, TextBlock, ToolResultBlock, ToolUseBlock} from "@/types/chat";
import {ErrorBlockContent} from "./contents/ErrorBlockContent";
import {TextBlockContent} from "./contents/TextBlockContent";
import {ToolResultBlockContent} from "./contents/ToolResultBlockContent";
import {ToolUseBlockContent} from "./contents/ToolUseBlockContent";

interface BlockContentProps {
    block: MessageBlock;
    onToolStatusChange?: (toolUseBlock: ToolUseBlock, status: "approved" | "rejected") => void;
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
                    onStatusChange={(status) => props.onToolStatusChange?.(props.block as ToolUseBlock, status)}
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