import type { Component } from 'solid-js';

const Loading: Component = () => {
  return (
    <div class="flex h-full w-full items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500" />
        <p class="text-gray-600">Loading...</p>
      </div>
    </div>
  );
};

export default Loading;