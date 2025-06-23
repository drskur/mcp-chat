import type { Component } from "solid-js";
import type { TextBlock } from "@/types/chat";

interface TextBlockProps {
  block: TextBlock;
}

export const TextBlockContent: Component<TextBlockProps> = (props) => {
  return (
    <div class="whitespace-pre-wrap text-justify prose prose-stone">
      {props.block.content}
    </div>
  );
};
