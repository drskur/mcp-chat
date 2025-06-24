import {AIMessage, ToolMessage} from "@langchain/core/messages";
import {Command, END, interrupt} from "@langchain/langgraph";
import type {StateAnnotation} from "@/lib/graph/state";
import type {HumanReviewChatInput, HumanReviewInput } from "@/types/chat";

export async function humanReview(state: typeof StateAnnotation.State) {
    const lastMessage = state.messages.at(-1);

    if (!(lastMessage instanceof AIMessage)) {
        return new Command({
            goto: "agent",
        });
    }

    if ((lastMessage.tool_calls ?? []).length === 0) {
        return new Command({
            goto: "agent"
        });
    }

    const review = interrupt<HumanReviewInput, HumanReviewChatInput>({
        toolCall: lastMessage.tool_calls ?? [],
    })

    if (review.action === "approved") {
        return new Command({
            goto: "tools"
        });
    } else if (review.action === "rejected") {
        // NOTE: we're adding feedback message as a ToolMessage to preserve the correct order in the message history
        // (AI messages with tool calls need to be followed by tool call messages)
        const toolCall = (lastMessage.tool_calls ?? []).at(0);
        const toolMessage = new ToolMessage({
            content: review.feedback ?? "The execution canceled by human",
            tool_call_id: toolCall?.id ?? "",
            name: toolCall?.name,
            additional_kwargs: {
                human_approval: false,
            }
        });
        return new Command({
            goto: "agent",
            update: {messages: [toolMessage]}
        })
    }

    return new Command({
        goto: END,
    });
}

export async function shouldHumanReview(
    state: typeof StateAnnotation.State,
): Promise<'humanReview' | typeof END> {
    const lastMessage = state.messages.at(-1);

    if (
        lastMessage instanceof AIMessage &&
        lastMessage.tool_calls &&
        lastMessage.tool_calls.length > 0
    ) {
        return 'humanReview';
    }

    return END;
}