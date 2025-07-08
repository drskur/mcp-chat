import { useAction, useParams } from "@solidjs/router";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import {
  cancelChatAction,
  streamNewChatAction,
  streamResumeChatAction,
} from "@/actions/chat";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { ToolApprovalDialog } from "@/components/chat/ToolApprovalDialog";
import Loading from "@/components/layout/Loading";
import { useTitleBar } from "@/components/layout/TitleBar";
import { cn } from "@/lib/utils";
import type {
  ChatMessage,
  ChatSession,
  InterruptBlock,
  MessageBlock,
  ToolCall,
  ToolUseBlock,
} from "@/types/chat";

export default function ChatPage() {
  const params = useParams();
  const [initialMessage, setInitialMessage] = createSignal<string | undefined>(
    undefined,
  );
  const [session, setSession] = createSignal<ChatSession | null>(null);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = createSignal(false);
  const [streamingMessageId, setStreamingMessageId] = createSignal<
    string | null
  >(null);
  const [streamingText, setStreamingText] = createSignal("");
  const [currentStreamId, setCurrentStreamId] = createSignal<string | null>(
    null,
  );
  const [toolApprovalOpen, setToolApprovalOpen] = createSignal(false);
  const [pendingToolCall, setPendingToolCall] = createSignal<
    ToolCall | undefined
  >();
  const { setTitle } = useTitleBar();
  const streamNewChat = useAction(streamNewChatAction);
  const streamResumeChat = useAction(streamResumeChatAction);
  const cancelStream = useAction(cancelChatAction);

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
      createdAt: new Date(),
    };
    setSession(newSession);
    setMessages(newSession.messages);
    setTitle(newSession.title);
  };

  // 초기 메시지 처리
  createEffect(async () => {
    if (initialMessage() && session()) {
      await handleSubmit(initialMessage() ?? "");
    }
  });

  // 타입 가드 함수들
  const isStreamingText = (value: unknown): value is string => {
    return typeof value === "string";
  };

  // 메시지 블록 업데이트 헬퍼 함수
  const updateMessageBlocks = (
    messages: ChatMessage[],
    messageId: string,
    newBlock: MessageBlock,
  ) => {
    return messages.map((msg) => {
      if (msg.id !== messageId) return msg;
      const { blocks } = msg;

      return { ...msg, blocks: [...blocks, newBlock] };
    });
  };

  // 스트림 값 처리 함수
  const processStreamValue = (value: unknown, aiMessageId: string) => {
    if (isStreamingText(value)) {
      setStreamingText((prev) => prev + value);
    } else {
      const newBlock = value as MessageBlock;

      // Interrupt 블록 처리
      if (newBlock.type === "interrupt") {
        const interruptBlock = newBlock as InterruptBlock;
        setPendingToolCall(interruptBlock.toolCall);
        setToolApprovalOpen(true);
        // 스트리밍 일시 중지
        setIsStreaming(false);
      } else {
        setMessages((prev) => updateMessageBlocks(prev, aiMessageId, newBlock));
      }
    }
  };

  // 사용자 메시지 생성 함수
  const createUserMessage = (message: string): ChatMessage => ({
    id: crypto.randomUUID(),
    role: "human",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "text",
        content: message,
      },
    ],
    timestamp: new Date(),
  });

  // AI 메시지 생성 함수
  const createAIMessage = (): ChatMessage => ({
    id: crypto.randomUUID(),
    role: "assistant",
    blocks: [],
    timestamp: new Date(),
  });

  // 스트리밍 상태 초기화 함수
  const resetStreamingState = () => {
    setIsStreaming(false);
    setCurrentStreamId(null);
    setStreamingText("");
  };

  // 마지막 메시지의 마지막 tool use 블록 args 업데이트 함수
  const updateLastToolUseBlockArgs = (
    modifiedArgs: Record<string, unknown>,
  ) => {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (!lastMessage) return prev;

      // 마지막 tool use 블록 찾기
      const toolUseBlocks = lastMessage.blocks.filter(
        (block) => block.type === "tool_use",
      );
      if (toolUseBlocks.length === 0) return prev;

      const lastToolUseBlock = toolUseBlocks[
        toolUseBlocks.length - 1
      ] as ToolUseBlock;

      // 해당 블록의 toolInput 업데이트
      const updatedBlocks = lastMessage.blocks.map((block) => {
        if (block.id === lastToolUseBlock.id) {
          return {
            ...block,
            toolInput: modifiedArgs,
          } as ToolUseBlock;
        }
        return block;
      });

      const updatedLastMessage = {
        ...lastMessage,
        blocks: updatedBlocks,
      };

      return [...prev.slice(0, -1), updatedLastMessage];
    });
  };

  const handleSubmit = async (message: string) => {
    // 사용자 메시지 추가
    const userMessage = createUserMessage(message);
    setMessages((prev) => [...prev, userMessage]);

    // AI 응답 메시지 생성 및 스트리밍 상태 설정
    const aiMessage = createAIMessage();
    setMessages((prev) => [...prev, aiMessage]);

    const streamId = crypto.randomUUID();
    setIsStreaming(true);
    setStreamingMessageId(aiMessage.id);
    setCurrentStreamId(streamId);

    try {
      const stream = await streamNewChat({
        message,
        sessionId: params.id,
        streamId,
      });

      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        processStreamValue(value, aiMessage.id);
      }
    } finally {
      resetStreamingState();
    }
  };

  const handleCancel = async () => {
    const streamId = currentStreamId();
    if (streamId) {
      await cancelStream(streamId);
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
    setCurrentStreamId(null);
  };

  const handleHumanReview = async (
    action: "approved" | "rejected",
    modifiedArgs?: Record<string, unknown>,
  ) => {
    const streamId = crypto.randomUUID();
    setIsStreaming(true);
    setCurrentStreamId(streamId);

    try {
      const stream = await streamResumeChat({
        sessionId: params.id,
        streamId,
        resume: {
          action,
          modifiedArgs,
        },
      });

      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        processStreamValue(value, streamingMessageId() ?? "");
      }
    } finally {
      resetStreamingState();
    }
  };

  const handleToolApproval = async (modifiedArgs?: Record<string, unknown>) => {
    setToolApprovalOpen(false);

    // 수정된 args가 있으면 마지막 tool use 블록 업데이트
    if (modifiedArgs) {
      updateLastToolUseBlockArgs(modifiedArgs);
    }

    await handleHumanReview("approved", modifiedArgs);
  };

  const handleToolRejection = async () => {
    setToolApprovalOpen(false);
    await handleHumanReview("rejected");
  };

  return (
    <Show when={session()} fallback={<Loading />}>
      <div class={cn("flex flex-col h-full w-full overflow-y-auto")}>
        {/* Chat Messages Area */}
        <div class="flex-1">
          <MessageList
            messages={messages()}
            streamingMessageId={streamingMessageId()}
            streamingText={streamingText()}
          />
        </div>

        {/* Chat Input Area */}
        <div class="sticky bottom-0 bg-background p-4 flex justify-center">
          <ChatInput
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isStreaming={isStreaming()}
          />
        </div>
      </div>

      {/* Tool Approval Dialog */}
      <ToolApprovalDialog
        open={toolApprovalOpen()}
        onOpenChange={setToolApprovalOpen}
        toolCall={pendingToolCall()}
        onApprove={handleToolApproval}
        onReject={handleToolRejection}
      />
    </Show>
  );
}
