'use server';

import { StateAnnotation } from '@/app/actions/agent/agent-state';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { Command, END, interrupt } from '@langchain/langgraph';
import { HumanReview } from '@/types/chat.types';

export async function humanReviewNode(
  state: typeof StateAnnotation.State,
  _config: any,
) {
  const lastMessage = state.messages.at(-1);

  if (!(lastMessage instanceof AIMessage)) {
    return new Command({
      goto: 'callModel',
    });
  }

  if ((lastMessage.tool_calls ?? []).length === 0) {
    return new Command({
      goto: 'callModel',
    });
  }

  const review: HumanReview = interrupt({
    toolCall: lastMessage.tool_calls ?? [],
  });

  if (review.action === 'yes') {
    return new Command({
      goto: 'tools',
    });
  } else if (review.action === 'no') {
    // NOTE: we're adding feedback message as a ToolMessage to preserve the correct order in the message history
    // (AI messages with tool calls need to be followed by tool call messages)
    const toolCall = (lastMessage.tool_calls ?? []).at(0);
    const toolMessage = new ToolMessage({
      content: 'The execution canceled by human review',
      tool_call_id: toolCall?.id ?? '',
      name: toolCall?.name,
    });
    console.log(toolMessage);
    return new Command({
      goto: 'callModel',
      update: { messages: [toolMessage] },
    });
  }

  return new Command({
    goto: END,
  });
}

export async function shouldHumanReview(
  state: typeof StateAnnotation.State,
): Promise<'humanReview' | typeof END> {
  const lastMessage = state.messages.at(-1);

  if (
    lastMessage instanceof AIMessage &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'humanReview';
  }

  return END;
}
