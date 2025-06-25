export type MessageRole = "human" | "assistant";

export interface ToolCall {
    name: string;
    args: Record<string, unknown>;
    id?: string;
    type?: "tool_call";
}

export interface HumanReviewInput {
    toolCall: ToolCall[],
}

export interface HumanReviewChatInput {
    action: 'approved' | 'rejected';
    feedback?: string;
    modifiedArgs?: Record<string, unknown>;
}

export interface TextBlock {
    id: string;
    type: "text";
    content: string;
}

export interface CodeBlock {
    id: string;
    type: "code";
    content: string;
    language: string;
}

export interface ToolUseBlock {
    id: string;
    type: "tool_use";
    toolName: string;
    toolInput: unknown;
    collapse: boolean;
}

export interface ToolResultBlock {
    id: string;
    type: "tool_result";
    toolName: string;
    content: string;
    collapse: boolean;
}

export interface ErrorBlock {
    id: string;
    type: "error";
    content: string;
}

export interface InterruptBlock {
    id: string;
    type: "interrupt";
    toolCall: ToolCall;
}

export type MessageBlock = TextBlock | CodeBlock | ToolUseBlock | ToolResultBlock | ErrorBlock | InterruptBlock;

export interface ChatMessage {
    id: string;
    role: MessageRole;
    blocks: MessageBlock[];
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
}

export interface ChatMessageInput {
    sessionId: string;
    streamId: string;
    message: string;
}

export type ChatStreamChunk = string | MessageBlock