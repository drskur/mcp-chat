"use server";

import {END, MemorySaver, START, StateGraph} from "@langchain/langgraph";
import {callModel} from "@/lib/graph/call-model";
import {StateAnnotation} from "./state";
import {getMCPManager} from "@/lib/mcp";
import {ToolNode, toolsCondition} from "@langchain/langgraph/prebuilt";

class WorkflowSingleton {
    private static instance: WorkflowSingleton;
    private graph: ReturnType<typeof StateGraph.prototype.compile> | null = null;
    private checkpointer: MemorySaver;
    private initPromise: Promise<void> | null = null;

    private constructor() {
        this.checkpointer = new MemorySaver();
    }

    private async initialize(): Promise<void> {
        if (this.graph) return;

        if (this.initPromise) {
            await this.initPromise;
            return;
        }

        this.initPromise = this._initialize();
        await this.initPromise;
    }

    private async _initialize(): Promise<void> {
        const tools = await getMCPManager().getTools();
        console.log(tools);
        const workflow = new StateGraph(StateAnnotation)
            .addNode("agent", callModel)
            .addNode("tools", new ToolNode(tools))
            .addEdge(START, "agent")
            .addConditionalEdges("agent", toolsCondition)
            .addEdge("tools", "agent");

        this.graph = workflow.compile({
            checkpointer: this.checkpointer,
        });
    }

    public static getInstance(): WorkflowSingleton {
        if (!WorkflowSingleton.instance) {
            WorkflowSingleton.instance = new WorkflowSingleton();
        }
        return WorkflowSingleton.instance;
    }

    public async getGraph() {
        await this.initialize();
        return this.graph!;
    }
}

export async function getWorkflowGraph() {
    const instance = WorkflowSingleton.getInstance();
    return instance.getGraph();
}