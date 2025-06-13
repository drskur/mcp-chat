'use server';

import { MemorySaver, START, StateGraph } from '@langchain/langgraph';
import { callModelNode } from '@/app/actions/agent/call-model';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { MCPClientManager } from '@/mcp/mcp-client-manager';
import { StateAnnotation } from '@/app/actions/agent/agent-state';
import { humanReviewNode, shouldHumanReview } from '@/app/actions/agent/human-review-node';

export async function createGraph() {
  const mcpClinet = await MCPClientManager.getInstance().getClient();
  const tools = await mcpClinet?.getTools() ?? [];
  const builder = new StateGraph(StateAnnotation)
    .addNode('callModel', callModelNode)
    .addNode('humanReview', humanReviewNode)
    .addNode("tools", new ToolNode(tools))
    .addEdge(START, 'callModel')
    .addConditionalEdges("callModel", shouldHumanReview)
    .addEdge("tools", "callModel");

  const checkpointer = new MemorySaver();

  return builder.compile({
    checkpointer,
  });
}

let graphInstance: Awaited<ReturnType<typeof createGraph>> | null = null;

export async function getGraph() {
  if (!graphInstance) {
    graphInstance = await createGraph();
  }
  return graphInstance;
}

// MCP 설정 변경 시 그래프를 다시 초기화하는 함수
export async function resetGraph() {
  graphInstance = null;
}