import {useParams} from "@solidjs/router";
import {createEffect, createSignal, onMount, Show } from "solid-js";
import {ChatInput} from "@/components/chat/ChatInput";
import {MessageList} from "@/components/chat/MessageList";
import {cn} from "@/lib/utils";
import type {ChatMessage, ChatSession } from "@/types/chat";

export default function ChatPage() {
    const params = useParams();
    const [initialMessage, setInitialMessage] = createSignal<string | undefined>(undefined);
    const [session, setSession] = createSignal<ChatSession | null>(null);
    const [messages, setMessages] = createSignal<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = createSignal(false);
    const [streamingMessageId, setStreamingMessageId] = createSignal<string | null>(null);

    onMount(() => {
        // Retrieve message from sessionStorage
        const storageKey = `chat-init-${params.id}`;
        const message = sessionStorage.getItem(storageKey);

        if (message) {
            setInitialMessage(message);
            // Remove from sessionStorage after retrieving
            sessionStorage.removeItem(storageKey);
        }

        // 세션 로드 또는 새 세션 생성
        loadOrCreateSession(params.id);
    });

    const loadOrCreateSession = (sessionId: string) => {
        // TODO: 실제로는 로컬 스토리지나 서버에서 세션을 로드
        // 지금은 새 세션을 생성
        const newSession: ChatSession = {
            id: sessionId,
            title: "",
            messages: [],
            createdAt: new Date()
        };
        setSession(newSession);
        setMessages(newSession.messages);
    };

    // 초기 메시지 처리
    createEffect(async () => {
        if (initialMessage() && session()) {
            await handleSubmit(initialMessage() ?? "");
        }
    });

    const handleSubmit = async (message: string) => {
        // 사용자 메시지 추가
        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "human",
            blocks: [{
                id: crypto.randomUUID(),
                type: "text",
                content: message
            }],
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsStreaming(true);

        // AI 응답을 위한 빈 메시지 생성
        const aiMessageId = crypto.randomUUID();
        const aiMessage: ChatMessage = {
            id: aiMessageId,
            role: "assistant",
            blocks: [],
            timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        setStreamingMessageId(aiMessageId);

        try {
            // TODO: 실제 AI API 호출 로직 구현
            console.log("메시지 전송:", message);
            console.log("채팅 ID:", params.id);

            // 임시로 지연 시뮬레이션
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error("메시지 전송 실패:", error);
        } finally {
            setIsStreaming(false);
            setStreamingMessageId(null);
        }
    };

    const handleCancel = () => {
        setIsStreaming(false);
        setStreamingMessageId(null);
    };

    return (
        <Show when={session()} fallback={<div>로딩 중...</div>}>
            <div class={cn("flex flex-col h-screen w-full")}>
                {/* Chat Messages Area */}
                <div class="flex-1 overflow-y-auto">
                    <Show
                        when={messages().length > 0}
                        fallback={
                            <div class="flex items-center justify-center h-full text-muted-foreground p-4">
                                새로운 채팅을 시작하세요
                            </div>
                        }
                    >
                        <MessageList
                            messages={messages()}
                            streamingMessageId={streamingMessageId()}
                        />
                    </Show>
                </div>

                {/* Chat Input Area */}
                <div class="p-4 flex justify-center">
                    <ChatInput
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        isStreaming={isStreaming()}
                        disabled={isStreaming()}
                    />
                </div>
            </div>
        </Show>
    );
}