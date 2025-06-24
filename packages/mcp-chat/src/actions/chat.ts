import {AIMessage, AIMessageChunk, HumanMessage, ToolMessage} from "@langchain/core/messages";
import {action} from "@solidjs/router";
import {getWorkflowGraph} from "@/lib/graph/workflow";
import type {ChatMessageInput, ChatStreamChunk} from "@/types/chat";

// 진행 중인 스트림을 관리하기 위한 Map
const activeStreams = new Map<string, AbortController>();

// ReadableStream 기반 스트리밍 응답
export const streamChatAction = action(async (input: ChatMessageInput & {
    streamId: string
}): Promise<ReadableStream<ChatStreamChunk>> => {
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
            let accStr = "";
            try {
                const humanMessage = new HumanMessage({content: input.message});

                const graph = await getWorkflowGraph();
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
                            accStr += chunk.text;
                            controller.enqueue(chunk.text);
                            break;
                        case chunk instanceof AIMessage:
                            // 텍스트 내용이 있으면 TextBlock 추가
                            if (chunk.text) {
                                controller.enqueue({
                                    id: crypto.randomUUID(),
                                    type: "text",
                                    content: chunk.text,
                                });
                            }

                            // tool_calls가 있으면 ToolUseBlock 추가
                            if (chunk.tool_calls && chunk.tool_calls.length > 0) {
                                for (const toolCall of chunk.tool_calls) {
                                    controller.enqueue({
                                        id: toolCall.id ?? crypto.randomUUID(),
                                        type: "tool_use",
                                        toolName: toolCall.name,
                                        toolInput: toolCall.args,
                                        collapse: false,
                                    });
                                }
                            }
                            break;
                        case chunk instanceof ToolMessage:
                            controller.enqueue({
                                id: crypto.randomUUID(),
                                type: "tool_result",
                                toolName: chunk.name ?? "",
                                content: typeof chunk.content === 'string'
                                    ? chunk.content
                                    : JSON.stringify(chunk.content, null, 2),
                                collapse: false,
                            });
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
                processError(error, accStr, controller);
                controller.close();
                activeStreams.delete(input.streamId);
            }
            accStr = "";
        },
        cancel() {
            // 스트림이 취소되면 정리
            activeStreams.delete(input.streamId);
        }
    });
});

// 스트림 취소 액션
export const cancelChatAction = action(async (streamId: string) => {
    "use server";
    const controller = activeStreams.get(streamId);
    if (controller) {
        controller.abort();
        activeStreams.delete(streamId);
    }
});

function processError(error: unknown, accStr: string, controller: ReadableStreamDefaultController<ChatStreamChunk>) {
    if (accStr.length > 0) {
        controller.enqueue({
            id: crypto.randomUUID(),
            type: "text",
            content: accStr,
        });
    }
    controller.enqueue({
        id: crypto.randomUUID(),
        type: "error",
        content: error?.toString() ?? "Unknown error",
    });
}