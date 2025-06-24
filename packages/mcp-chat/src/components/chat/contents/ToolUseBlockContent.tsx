import { Check, ChevronDown, ChevronRight, Clock, X } from "lucide-solid";
import type { Component } from "solid-js";
import { createSignal, Show, Switch, Match } from "solid-js";
import { Button } from "@/components/ui/button";
import type { ToolUseBlock } from "@/types/chat";

interface ToolUseBlockProps {
  block: ToolUseBlock;
  onStatusChange?: (status: "approved" | "rejected") => void;
}

export const ToolUseBlockContent: Component<ToolUseBlockProps> = (props) => {
  const [isCollapsed, setIsCollapsed] = createSignal(props.block.collapse);

  const getStatusStyles = () => {
    switch (props.block.status) {
      case "pending":
        return "border-accent bg-accent";
      case "approved":
        return "border-primary bg-primary/10";
      case "rejected":
        return "border-destructive bg-destructive/10";
      default:
        return "border-border bg-muted/50";
    }
  };

  return (
    <div class={`border rounded-md mt-2 ${getStatusStyles()}`}>
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
          <Switch>
            <Match when={props.block.status === "pending"}>
              <Clock class="w-4 h-4 text-muted-foreground" />
            </Match>
            <Match when={props.block.status === "approved"}>
              <Check class="w-4 h-4 text-primary" />
            </Match>
            <Match when={props.block.status === "rejected"}>
              <X class="w-4 h-4 text-destructive" />
            </Match>
          </Switch>
        </button>
        <Show when={props.block.status === "pending"}>
          <div class="flex gap-2 ml-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => props.onStatusChange?.("approved")}
            >
              <Check class="w-3 h-3 mr-1" />
              승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => props.onStatusChange?.("rejected")}
            >
              <X class="w-3 h-3 mr-1" />
              거절
            </Button>
          </div>
        </Show>
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
