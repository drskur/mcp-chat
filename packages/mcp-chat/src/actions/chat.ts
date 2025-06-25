import {AIMessage, AIMessageChunk, HumanMessage, ToolMessage} from "@langchain/core/messages";
import {action, revalidate} from "@solidjs/router";
import {getWorkflowGraph} from "@/lib/graph/workflow";
import type {ChatMessageInput, ChatStreamChunk, HumanReviewChatInput} from "@/types/chat";
import {Command} from "@langchain/langgraph";

// 진행 중인 스트림을 관리하기 위한 Map
const activeStreams = new Map<string, AbortController>();

// biome-ignore lint/suspicious/noExplicitAny: LangGraph stream output types are complex
async function processGraphStream(graphStream: AsyncIterable<[string, any]>, accStr: string, controller: ReadableStreamDefaultController<ChatStreamChunk>) {
    let toolUseId: string | null = null;
    for await (const output of graphStream) {
        const [streamMode, stream] = output;
        if (streamMode === "messages") {
            const [chunk, _] = stream;
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
                            toolUseId = toolCall.id ?? crypto.randomUUID();
                            controller.enqueue({
                                id: toolUseId,
                                type: "tool_use",
                                toolName: toolCall.name,
                                toolInput: toolCall.args,
                                collapse: true,
                            });
                        }
                    }
                    break;
                case chunk instanceof ToolMessage:
                    console.log(chunk);
                    controller.enqueue({
                        id: crypto.randomUUID(),
                        type: "tool_result",
                        toolName: chunk.name ?? "",
                        content: typeof chunk.content === 'string'
                            ? chunk.content
                            : JSON.stringify(chunk.content, null, 2),
                        collapse: true,
                    });
                    break;
                default:
                    break;
            }
        } else if (streamMode === "updates" && "__interrupt__" in stream) {
            // TODO: Alert Dialog 뜰 수 있는 메세지 전달.
        }
    }
    return accStr;
}

// 입력 준비 함수들
function buildNewChatInput(message: string) {
    return {messages: [new HumanMessage({content: message})]};
}

function buildResumeInput(resume: HumanReviewChatInput) {
    return new Command<HumanReviewChatInput>({resume});
}

// 새 메시지 스트리밍 액션
export const streamNewChatAction = action(async (input: ChatMessageInput): Promise<ReadableStream<ChatStreamChunk>> => {
    "use server";
    const graphInput = buildNewChatInput(input.message);
    return createChatStream(graphInput, input.sessionId, input.streamId);
});

// Resume 스트리밍 액션
export const streamResumeChatAction = action(async (input: {
    sessionId: string,
    streamId: string,
    resume: HumanReviewChatInput
}): Promise<ReadableStream<ChatStreamChunk>> => {
    "use server";
    const {sessionId, streamId, resume} = input;
    const graphInput = buildResumeInput(resume);
    return createChatStream(graphInput, sessionId, streamId);
});

// 공통 스트리밍 로직
function createChatStream(
    graphInput: { messages: HumanMessage[] } | Command<HumanReviewChatInput>,
    sessionId: string,
    streamId: string
): ReadableStream<ChatStreamChunk> {
    // 이전 스트림이 있으면 취소
    const existingController = activeStreams.get(streamId);
    if (existingController) {
        existingController.abort();
    }

    // 새 AbortController 생성
    const abortController = new AbortController();
    activeStreams.set(streamId, abortController);

    return new ReadableStream<ChatStreamChunk>({
        async start(controller) {
            let accStr = "";
            try {
                const graph = await getWorkflowGraph();
                const graphStream = await graph.stream(
                    graphInput,
                    {
                        configurable: {thread_id: sessionId},
                        streamMode: ["messages", "updates"],
                        signal: abortController.signal,
                    }
                );
                accStr = await processGraphStream(graphStream, accStr, controller);

                // 스트림 종료
                controller.close();
                activeStreams.delete(streamId);

            } catch (error) {
                console.error("Error in streamChatResponse:", error);
                processError(error, accStr, controller);
                controller.close();
                activeStreams.delete(streamId);
            }
            accStr = "";
        },
        cancel() {
            // 스트림이 취소되면 정리
            activeStreams.delete(streamId);
        }
    });
}

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