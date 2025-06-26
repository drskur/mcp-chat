import type { Component } from 'solid-js';

interface LoadingProps {
  text?: string;
}

const Loading: Component<LoadingProps> = (props) => {
  return (
    <div class="flex h-full w-full items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p class="text-sm text-muted-foreground">{props.text ?? "Loading..."}</p>
      </div>
    </div>
  );
};

export default Loading;