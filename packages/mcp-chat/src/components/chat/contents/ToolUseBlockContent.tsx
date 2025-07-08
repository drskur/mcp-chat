import { ChevronDown, ChevronRight } from "lucide-solid";
import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";
import type { ToolUseBlock } from "@/types/chat";

interface ToolUseBlockProps {
  block: ToolUseBlock;
}

export const ToolUseBlockContent: Component<ToolUseBlockProps> = (props) => {
  const [isCollapsed, setIsCollapsed] = createSignal(props.block.collapse);

  return (
    <div class="border rounded-md mt-2 border-border bg-muted/50">
      <div class="px-3 py-2 flex items-center justify-between">
        <button
          class="flex-1 flex items-center gap-2 text-left"
          onClick={() => setIsCollapsed(!isCollapsed())}
        >
          <Show when={isCollapsed()} fallback={<ChevronDown class="w-4 h-4" />}>
            <ChevronRight class="w-4 h-4" />
          </Show>
          <span class="font-medium text-sm">
            도구 사용: {props.block.toolName}
          </span>
        </button>
      </div>
      <Show when={!isCollapsed()}>
        <div class="px-3 pb-3">
          <pre class="text-xs bg-background text-foreground p-2 rounded overflow-x-auto border border-border">
            <code>{JSON.stringify(props.block.toolInput, null, 2)}</code>
          </pre>
        </div>
      </Show>
    </div>
  );
};
