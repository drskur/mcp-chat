import {HumanMessage} from "@langchain/core/messages";
import {action} from "@solidjs/router";
import {graph} from "@/lib/graph/workflow";
import type {ChatMessageInput, ErrorBlock, MessageBlock} from "@/types/chat";

// 일반적인 비스트리밍 응답을 위한 임시 구현
export const streamChatResponse = action(async (input: ChatMessageInput) => {
    "use server";

    try {

        const humanMessage = new HumanMessage({content: input.message});

        const config = {
            configurable: {thread_id: input.sessionId},
            streamMode: "values" as const,
        };

        const stream = await graph.stream(
            {messages: [humanMessage]},
            config
        );

        const blocks: MessageBlock[] = [];

        for await (const chunk of stream) {
            console.log("Chunk received:", chunk);
            // TODO: chunk를 MessageBlock으로 변환하는 로직 추가
        }

        // 임시로 텍스트 응답 반환
        const textBlock: MessageBlock = {
            id: crypto.randomUUID(),
            type: "text",
            content: "This is a placeholder response. Real AI response will be implemented soon."
        };

        return [textBlock];

    } catch (error) {
        console.error("Error in streamChatResponse:", error);
        const errorBlock: ErrorBlock = {
            id: crypto.randomUUID(),
            type: "error",
            content: error?.toString() ?? "Unknown error",
        };
        return [errorBlock];
    }
});