import { MemorySaver, START, StateGraph } from '@langchain/langgraph';
import { StateAnnotation } from '@/agent/state';
import { callModelNode } from '@/agent/call-model';

export function createGraph() {
  const builder = new StateGraph(StateAnnotation)
    .addNode('callModel', callModelNode)
    .addEdge(START, 'callModel');

  const checkpointer = new MemorySaver();

  return builder.compile({
    checkpointer,
  });
}

export const graph = createGraph();
