import { useNavigate } from "@solidjs/router";
import { onMount } from "solid-js";
import { ChatInput } from "@/components/chat/ChatInput";
import { useTitleBar } from "@/components/layout/TitleBar";

export default function NewChat() {
  const navigate = useNavigate();
  const { setTitle } = useTitleBar();

  onMount(() => {
    setTitle("");
  });

  const handleSubmit = (message: string) => {
    // Generate UUID v4
    const uuid = crypto.randomUUID();

    // Store message in sessionStorage
    sessionStorage.setItem(`chat-init-${uuid}`, message);

    // Navigate to chat page without message in URL
    navigate(`/chat/${uuid}`);
  };

  return (
    <div class="flex flex-col h-full w-full items-center justify-center px-8">
      {/* Welcome Message */}
      <div class="text-center mb-8">
        <h1 class="text-2xl font-semibold mb-2">
          MCP Chat에 오신 것을 환영합니다
        </h1>
      </div>

      {/* Chat Input */}
      <ChatInput onSubmit={handleSubmit} />
    </div>
  );
}
