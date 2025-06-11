import { MemorySaver, START, StateGraph } from '@langchain/langgraph';
import { StateAnnotation } from '@/agent/state';
import { callModelNode } from '@/agent/call-model';
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

export const graph = await createGraph();
