"use server";

import type {BaseMessage} from "@langchain/core/messages";
import {Annotation, messagesStateReducer} from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
});

export type GraphState = typeof StateAnnotation.State;