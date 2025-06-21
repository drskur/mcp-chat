"use server";

import {ChatBedrockConverse} from "@langchain/aws";
import {AIMessage} from "@langchain/core/messages";
import type {StateAnnotation} from "@/lib/graph/state";

const HAIKU35 = "us.anthropic.claude-3-5-haiku-20241022-v1:0";

export async function callModel(state: typeof StateAnnotation.State) {

    const region = process.env.AWS_REGION ?? "us-east-1";


    const llm = new ChatBedrockConverse({
        model: HAIKU35,
        region,
    })

    const res = await llm.invoke(state.messages)

    const aiMessage = new AIMessage({
        content: res.content,
        tool_calls: res.tool_calls,
    })

    return {messages: [aiMessage]};
}