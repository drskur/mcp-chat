export type MessageRole = "human" | "assistant";

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
}

export interface ToolResultBlock {
    id: string;
    type: "tool_result";
    toolName: string;
    content: string;
}

export interface ErrorBlock {
    id: string;
    type: "error";
    content: string;
    errorType: string;
}

export type MessageBlock = TextBlock | CodeBlock | ToolUseBlock | ToolResultBlock | ErrorBlock;

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

