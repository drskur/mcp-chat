import {useAction, useParams} from "@solidjs/router";
import {createEffect, createSignal, onMount, Show} from "solid-js";
import {streamChatResponse} from "@/actions/chat";
import {ChatInput} from "@/components/chat/ChatInput";
import {MessageList} from "@/components/chat/MessageList";
import Loading from "@/components/layout/Loading";
import {useTitleBar} from "@/components/layout/TitleBar";
import {cn} from "@/lib/utils";
import type {ChatMessage, ChatSession} from "@/types/chat";

export default function ChatPage() {
    const params = useParams();
    const [initialMessage, setInitialMessage] = createSignal<string | undefined>(undefined);
    const [session, setSession] = createSignal<ChatSession | null>(null);
    const [messages, setMessages] = createSignal<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = createSignal(false);
    const [streamingMessageId, setStreamingMessageId] = createSignal<string | null>(null);
    const {setTitle} = useTitleBar();
    const sendChat = useAction(streamChatResponse);

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
            title: "새 대화",
            messages: [],
            createdAt: new Date()
        };
        setSession(newSession);
        setMessages(newSession.messages);
        setTitle(newSession.title);
    };

    // 초기 메시지 처리
    createEffect(async () => {
        if (initialMessage() && session()) {
            // await handleSubmit(initialMessage() ?? "");
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
            const blocks = await sendChat({
                message,
                sessionId: params.id
            });

            // 서버에서 받은 블록들을 AI 메시지에 추가
            setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId
                    ? {...msg, blocks: blocks}
                    : msg
            ));
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
        <Show when={session()} fallback={<Loading/>}>
            <div class={cn("flex flex-col h-full w-full")}>
                {/* Chat Messages Area */}
                <div class="flex-1">
                    <div class="h-full overflow-y-auto pb-4">
                        <MessageList
                            messages={messages()}
                            streamingMessageId={streamingMessageId()}
                        />
                    </div>
                </div>

                {/* Chat Input Area */}
                <div class="sticky bottom-0 bg-background p-4 flex justify-center">
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