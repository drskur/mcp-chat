import { ChevronDown, ChevronRight } from "lucide-solid";
import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";
import type { ToolResultBlock } from "@/types/chat";

interface ToolResultBlockProps {
  block: ToolResultBlock;
}

export const ToolResultBlockContent: Component<ToolResultBlockProps> = (
  props,
) => {
  const [isCollapsed, setIsCollapsed] = createSignal(props.block.collapse);

  return (
    <div class="border border-border bg-muted/50 rounded-md mt-2">
      <button
        class="w-full px-3 py-2 flex items-center justify-between hover:bg-muted transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed())}
      >
        <div class="flex items-center gap-2">
          <Show when={isCollapsed()} fallback={<ChevronDown class="w-4 h-4" />}>
            <ChevronRight class="w-4 h-4" />
          </Show>
          <span class="font-medium text-sm">
            도구 결과: {props.block.toolName}
          </span>
        </div>
      </button>
      <Show when={!isCollapsed()}>
        <div class="px-3 pb-3 pt-1">
          <pre class="text-xs bg-background text-foreground p-2 rounded overflow-x-auto border border-border">
            <code>{props.block.content}</code>
          </pre>
        </div>
      </Show>
    </div>
  );
};
