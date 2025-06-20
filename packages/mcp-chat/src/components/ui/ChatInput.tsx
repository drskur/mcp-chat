import {TextField} from "@kobalte/core/text-field";
import type {Component} from "solid-js";
import {createSignal, Show} from "solid-js";
import {cn} from "@/lib/utils";
import {TextArea} from "./textarea";
import {Button} from "./button";
import {ArrowUp, Square} from "lucide-solid";

interface ChatInputProps {
    initialValue?: string;
    onInput?: (value: string) => void;
    onSubmit?: () => void;
    onCancel?: () => void;
    isStreaming?: boolean;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
}

export const ChatInput: Component<ChatInputProps> = (props) => {
    const [inputValue, setInputValue] = createSignal(props.initialValue ?? "");

    const handleInput = (value: string) => {
        setInputValue(value);
        props.onInput?.(value);
    };

    const handleSubmit = () => {
        if (inputValue().trim() && !props.isStreaming) {
            props.onSubmit?.();
            setInputValue("");
        }
    };

    const handleButtonClick = () => {
        if (props.isStreaming) {
            props.onCancel?.();
        } else {
            handleSubmit();
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && props.isStreaming) {
            e.preventDefault();
            props.onCancel?.();
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div class={cn("w-full max-w-[700px] mx-8 relative", props.class)}>
            {/* Text Input Area */}
            <TextField
                class="w-full"
                value={inputValue()}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
            >
                <TextArea
                    placeholder={props.placeholder ?? "오늘 어떤 도움을 드릴까요?"}
                    disabled={props.disabled}
                    class="resize-none h-[100px] w-full rounded-2xl border border-border bg-background px-4 py-3 pr-14 text-base leading-relaxed shadow-sm focus-visible:border-ring"
                />
            </TextField>

            {/* Send/Stop Button */}
            <Button
                onClick={handleButtonClick}
                disabled={props.disabled ?? (!props.isStreaming && !inputValue().trim())}
                variant="outline"
                size="icon"
                class="absolute bottom-3 right-3 h-8 w-8 z-10 enabled:cursor-pointer"
            >
                <Show when={props.isStreaming} fallback={<ArrowUp size={16} />}>
                    <Square size={16} />
                </Show>
            </Button>
        </div>
    );
};