import { ArrowUp, Pause } from "lucide-solid";
import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";
import { TextFieldRoot } from "@/components/ui/textfield";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { TextArea } from "../ui/textarea";

interface ChatInputProps {
  initialValue?: string;
  onSubmit?: (message: string) => void;
  onCancel?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
  disabled?: boolean;
  class?: string;
}

export const ChatInput: Component<ChatInputProps> = (props) => {
  const [inputValue, setInputValue] = createSignal(props.initialValue ?? "");
  const [isComposing, setIsComposing] = createSignal(false);

  const handleInput = (value: string) => {
    setInputValue(value);
  };

  const handleSubmit = () => {
    const message = inputValue().trim();
    if (message && !props.isStreaming) {
      props.onSubmit?.(message);
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
    } else if (e.key === "Enter" && !e.shiftKey && !isComposing()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <div class={cn("w-full max-w-[700px] mx-8 relative", props.class)}>
      <TextFieldRoot class="w-full" value={inputValue()} onChange={handleInput}>
        <TextArea
          placeholder={props.placeholder ?? "오늘 어떤 도움을 드릴까요?"}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          class="resize-none h-[100px] w-full rounded-2xl border border-border bg-background px-4 py-3 pr-14 text-base leading-relaxed shadow-sm focus-visible:border-ring"
        />
      </TextFieldRoot>

      {/* Send/Stop Button */}
      <Button
        onClick={handleButtonClick}
        disabled={props.isStreaming ? false : !inputValue().trim()}
        variant="outline"
        size="icon"
        class="absolute bottom-3 right-3 h-8 w-8 z-10 enabled:cursor-pointer"
      >
        <Show when={props.isStreaming} fallback={<ArrowUp size={16} />}>
          <Pause size={16} />
        </Show>
      </Button>
    </div>
  );
};
