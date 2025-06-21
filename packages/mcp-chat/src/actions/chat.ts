import {AIMessage, AIMessageChunk, HumanMessage, ToolMessage} from "@langchain/core/messages";
import {action} from "@solidjs/router";
import {graph} from "@/lib/graph/workflow";
import type {ChatMessageInput, ChatStreamChunk, MessageBlock} from "@/types/chat";

// ReadableStream 기반 스트리밍 응답
export const streamChatResponse = action(async (input: ChatMessageInput): Promise<ReadableStream<ChatStreamChunk>> => {
    "use server";

    return new ReadableStream<ChatStreamChunk>({
        async start(controller) {
            try {
                const humanMessage = new HumanMessage({content: input.message});

                const graphStream = await graph.stream(
                    {messages: [humanMessage]},
                    {
                        configurable: {thread_id: input.sessionId},
                        streamMode: "messages"
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

                    // if (chunk?.messages?.length > 0) {
                    //     const lastMessage = chunk.messages[chunk.messages.length - 1];
                    //
                    //     let content = "";
                    //     if (typeof lastMessage?.content === "string") {
                    //         content = lastMessage.content;
                    //     } else if (Array.isArray(lastMessage?.content)) {
                    //         content = lastMessage.content
                    //             .filter(item => typeof item === "string" || (typeof item === "object" && item?.type === "text"))
                    //             .map(item => typeof item === "string" ? item : (item as any).text || "")
                    //             .join("");
                    //     }
                    //
                    //     if (content && !accumulatedContent.includes(content)) {
                    //         accumulatedContent = content;
                    //
                    //         const textBlock: MessageBlock = {
                    //             id: blockId,
                    //             type: "text",
                    //             content: accumulatedContent
                    //         };
                    //
                    //         // JSON으로 스트리밍
                    //         const data = JSON.stringify({blocks: [textBlock]});
                    //         controller.enqueue(encoder.encode(data));
                    //     }
                    // }
                }

                // 스트림 종료
                controller.close();

            } catch (error) {
                console.error("Error in streamChatResponse:", error);
                processError(error, controller);
                controller.close();
            }
        },
    });
});

function processError(error: unknown, controller: ReadableStreamDefaultController<ChatStreamChunk>) {
    const errorBlock: MessageBlock = {
        id: crypto.randomUUID(),
        type: "error",
        content: error?.toString() ?? "Unknown error",
    };
    controller.enqueue(errorBlock);
}