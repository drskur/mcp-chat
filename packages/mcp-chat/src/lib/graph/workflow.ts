"use server";

import {END, MemorySaver, START, StateGraph} from "@langchain/langgraph";
import {callModel} from "@/lib/graph/call-model";
import {StateAnnotation} from "./state";


const workflow = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    // .addNode("tools", callTools)
    .addEdge(START, "agent")
    // .addConditionalEdges("agent", shouldContinue)
    .addEdge("agent", END);

const checkpointer = new MemorySaver();

export const graph = workflow.compile({
    checkpointer,
});