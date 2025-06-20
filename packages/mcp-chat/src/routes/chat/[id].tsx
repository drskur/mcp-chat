import { useParams } from "@solidjs/router";
import { onMount, createSignal } from "solid-js";
import { ChatSession } from "@/components/chat/ChatSession";

export default function ChatPage() {
    const params = useParams();
    const [initialMessage, setInitialMessage] = createSignal<string>("");

    onMount(() => {
        // Retrieve message from sessionStorage
        const storageKey = `chat-init-${params.id}`;
        const message = sessionStorage.getItem(storageKey);
        
        if (message) {
            setInitialMessage(message);
            // Remove from sessionStorage after retrieving
            sessionStorage.removeItem(storageKey);
            
            // TODO: 메시지 처리 로직 추가
            console.log("초기 메시지:", message);
            console.log("채팅 ID:", params.id);
        }
    });

    return (
        <ChatSession>
            <div class="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div>채팅 ID: {params.id}</div>
                {initialMessage() && (
                    <div class="mt-2">초기 메시지: {initialMessage()}</div>
                )}
            </div>
        </ChatSession>
    );
}