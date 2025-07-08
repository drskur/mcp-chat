"use server";

import { MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { callModel } from "@/lib/graph/call-model";
import { humanReview, shouldHumanReview } from "@/lib/graph/human-review";
import { getMCPManager } from "@/lib/mcp";
import { StateAnnotation } from "./state";

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
    const workflow = new StateGraph(StateAnnotation)
      .addNode("agent", callModel)
      .addNode("tools", new ToolNode(tools))
      .addNode("humanReview", humanReview)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", shouldHumanReview)
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
    return this.graph;
  }

  public async refresh(): Promise<void> {
    this.graph = null;
    this.initPromise = null;
    await this.initialize();
  }
}

export async function getWorkflowGraph() {
  const instance = WorkflowSingleton.getInstance();
  const graph = await instance.getGraph();
  if (!graph) {
    throw new Error("The graph is not initialized");
  }

  return graph;
}

export async function refreshWorkflowGraph(): Promise<void> {
  const instance = WorkflowSingleton.getInstance();
  await instance.refresh();
}
