'use server';

import {
  StateAnnotation,
  PendingToolCall,
} from '@/app/actions/agent/agent-state';
import { AIMessage } from '@langchain/core/messages';
import { END } from '@langchain/langgraph';

export async function interruptNode(
  state: typeof StateAnnotation.State,
  _config: any,
) {
  const lastMessage = state.messages.at(-1);

  if (
    lastMessage instanceof AIMessage &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    // Tool calls이 있는 경우 interrupt 상태로 설정
    const pendingToolCalls: PendingToolCall[] = lastMessage.tool_calls.map(
      (toolCall) => ({
        name: toolCall.name,
        args: toolCall.args || {},
        id: toolCall.id || '',
      }),
    );

    return {
      pendingToolCalls,
      isInterrupted: true,
      userApproval: false,
    };
  }

  // Tool calls가 없으면 그대로 진행
  return {
    isInterrupted: false,
    pendingToolCalls: [],
  };
}

export async function shouldInterrupt(
  state: typeof StateAnnotation.State,
): Promise<'interrupt' | typeof END> {
  const lastMessage = state.messages.at(-1);

  if (
    lastMessage instanceof AIMessage &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'interrupt';
  }

  return END;
}

export async function shouldExecute(
  state: typeof StateAnnotation.State,
): Promise<'tools' | typeof END> {
  if (
    state.userApproval &&
    state.pendingToolCalls &&
    state.pendingToolCalls.length > 0
  ) {
    return 'tools';
  }

  return END;
}
