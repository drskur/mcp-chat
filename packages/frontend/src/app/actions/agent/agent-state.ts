import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

export interface PendingToolCall {
  name: string;
  args: Record<string, any>;
  id: string;
}

export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  pendingToolCalls: Annotation<PendingToolCall[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  userApproval: Annotation<boolean>({
    reducer: (x, y) => y ?? x ?? false,
    default: () => false,
  }),
  isInterrupted: Annotation<boolean>({
    reducer: (x, y) => y ?? x ?? false,
    default: () => false,
  }),
});