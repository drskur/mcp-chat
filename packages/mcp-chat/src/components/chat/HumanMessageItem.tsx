import type { Component } from "solid-js";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

interface HumanMessageItemProps {
  message: ChatMessage;
  class?: string;
}

export const HumanMessageItem: Component<HumanMessageItemProps> = (props) => {
  const content = props.message.blocks
    .filter((block) => block.type === "text")
    .map((block: any) => block.content)
    .join("\n");

  return (
    <div class={cn("flex items-start gap-2", props.class)}>
      {/* User Avatar */}
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
        U
      </div>

      {/* Message Content */}
      <div class="flex-1 min-w-0 mt-1.5">
        <p class="text-sm text-foreground whitespace-pre-wrap break-words text-justify">
          {content}
        </p>
      </div>
    </div>
  );
};
