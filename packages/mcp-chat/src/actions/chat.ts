import {AIMessage, AIMessageChunk, HumanMessage, ToolMessage} from "@langchain/core/messages";
import {action} from "@solidjs/router";
import {graph} from "@/lib/graph/workflow";
import type {ChatMessageInput, ChatStreamChunk, MessageBlock} from "@/types/chat";

// 진행 중인 스트림을 관리하기 위한 Map
const activeStreams = new Map<string, AbortController>();

// ReadableStream 기반 스트리밍 응답
export const streamChatResponse = action(async (input: ChatMessageInput & { streamId: string }): Promise<ReadableStream<ChatStreamChunk>> => {
    "use server";
    
    // 이전 스트림이 있으면 취소
    const existingController = activeStreams.get(input.streamId);
    if (existingController) {
        existingController.abort();
    }
    
    // 새 AbortController 생성
    const abortController = new AbortController();
    activeStreams.set(input.streamId, abortController);
    
    return new ReadableStream<ChatStreamChunk>({
        async start(controller) {
            try {
                const humanMessage = new HumanMessage({content: input.message});

                const graphStream = await graph.stream(
                    {messages: [humanMessage]},
                    {
                        configurable: {thread_id: input.sessionId},
                        streamMode: "messages",
                        signal: abortController.signal,
                    }
                );

                for await (const output of graphStream) {
                    const [chunk, _] = output;
                    switch (true) {
                        case chunk instanceof AIMessageChunk:
                            controller.enqueue(chunk.text);
                            break;
                        case chunk instanceof AIMessage:
                            controller.enqueue({
                                id: crypto.randomUUID(),
                                type: "text",
                                content: chunk.text,
                            });
                            break;
                        case chunk instanceof ToolMessage:
                            break;
                        default:
                            break;
                    }
                }

                // 스트림 종료
                controller.close();
                activeStreams.delete(input.streamId);

            } catch (error) {
                console.error("Error in streamChatResponse:", error);
                processError(error, controller);
                controller.close();
                activeStreams.delete(input.streamId);
            }
        },
        cancel() {
            // 스트림이 취소되면 정리
            activeStreams.delete(input.streamId);
        }
    });
});

// 스트림 취소 액션
export const cancelChatStream = action(async (streamId: string) => {
    "use server";
    const controller = activeStreams.get(streamId);
    if (controller) {
        controller.abort();
        activeStreams.delete(streamId);
    }
});

function processError(error: unknown, controller: ReadableStreamDefaultController<ChatStreamChunk>) {
    const errorBlock: MessageBlock = {
        id: crypto.randomUUID(),
        type: "error",
        content: error?.toString() ?? "Unknown error",
    };
    controller.enqueue(errorBlock);
}