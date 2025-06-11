'use server';

import { MemorySaver, START, StateGraph } from '@langchain/langgraph';
import { StateAnnotation } from '@/lib/agent-state';
import { callModelNode } from '@/app/actions/agent/call-model';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { MCPClientManager } from '@/mcp/mcp-client-manager';

export async function createGraph() {
  const mcpClinet = await MCPClientManager.getInstance().getClient();
  const tools = await mcpClinet?.getTools() ?? [];
  const builder = new StateGraph(StateAnnotation)
    .addNode('callModel', callModelNode)
    .addNode("tools", new ToolNode(tools))
    .addEdge(START, 'callModel')
    .addConditionalEdges("callModel", toolsCondition)
    .addEdge("tools", "callModel");

  const checkpointer = new MemorySaver();

  return builder.compile({
    checkpointer,
  });
}

let graphInstance: any = null;

export async function getGraph() {
  if (!graphInstance) {
    graphInstance = await createGraph();
  }
  return graphInstance;
}