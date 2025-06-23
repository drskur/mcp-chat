import type { Component } from "solid-js";
import { Match, Switch } from "solid-js";
import type { ErrorBlock } from "@/types/chat";

interface ErrorBlockProps {
  block: ErrorBlock;
}

export const ErrorBlockContent: Component<ErrorBlockProps> = (props) => {
  const isUserAbort = props.block.content.toLowerCase().includes("abort");

  return (
    <Switch>
      <Match when={isUserAbort}>
        <div class="border border-destructive/20 bg-destructive/10 p-3 rounded-md mt-4">
          <div class="whitespace-pre-wrap text-foreground">사용자가 요청을 취소했습니다.</div>
        </div>
      </Match>
      <Match when={true}>
        <div class="border border-destructive/20 bg-destructive/10 p-3 rounded-md">
          <div class="text-destructive text-sm whitespace-pre-wrap">
            {props.block.content}
          </div>
        </div>
      </Match>
    </Switch>
  );
};
