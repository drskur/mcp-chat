import {TextField} from "@kobalte/core/text-field";
import type {Component} from "solid-js";
import {cn} from "@/lib/utils";
import {TextArea} from "./textarea";

interface ChatInputProps {
    value?: string;
    onInput?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
}

export const ChatInput: Component<ChatInputProps> = (props) => {
    return (
        <div class={cn("w-full max-w-[700px] mx-8", props.class)}>
            {/* Text Input Area */}
            <TextField
                class="w-full"
                value={props.value}
                onChange={props.onInput}
            >
                <TextArea
                    placeholder={props.placeholder || "오늘 어떤 도움을 드릴까요?"}
                    disabled={props.disabled}
                    class="resize-none h-[100px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-base leading-relaxed shadow-sm focus-visible:border-ring"
                />
            </TextField>


        </div>
    );
};