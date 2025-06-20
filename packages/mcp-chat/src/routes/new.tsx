import {ChatInput} from "@/components/ui/ChatInput";

export default function NewChat() {
    return (
        <div class="flex flex-col h-full w-full items-center justify-center px-8">
            {/* Welcome Message */}
            <div class="text-center mb-8">
                <h1 class="text-2xl font-semibold mb-2">MCP Chat에 오신 것을 환영합니다</h1>
            </div>

            {/* Chat Input */}
            <ChatInput/>
        </div>
    );
}
