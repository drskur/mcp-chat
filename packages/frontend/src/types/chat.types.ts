export interface MessageChunk {
  type: "text" | "tool_use" | "tool_result" | "image" | "document";
  text?: string;
  name?: string;
  input?: string;
  image_data?: string;
  mime_type?: string;
  id?: string;
  index: number;
  filename?: string;
}

export interface StreamData {
  chunk: MessageChunk[];
  toolCalls: null | unknown;
  metadata: {
    langgraph_node: string;
    langgraph_step: number;
    type: string;
    is_image?: boolean;
    image_data?: string;
    mime_type?: string;
  }
}

export interface TextContentItem {
  id: string;
  type: "text";
  content: string;
  timestamp: number;
}

export interface ToolUseContentItem {
  id: string;
  type: "tool_use";
  name: string;
  input: string;
  timestamp: number;
  collapsed?: boolean;
  requiresApproval?: boolean;
  approved?: boolean;
}

export interface ToolResultContentItem {
  id: string;
  type: "tool_result";
  result: string;
  timestamp: number;
  collapsed?: boolean;
}

export interface ImageContentItem {
  id: string;
  type: "image";
  imageData: string;
  mimeType: string;
  timestamp: number;
}

export interface DocumentContentItem {
  id: string;
  type: "document";
  filename: string;
  fileType: string;
  fileSize: number;
  timestamp: number;
  fileUrl?: string;
  fileId?: string;
}

export type ContentItem = TextContentItem | ToolUseContentItem | ToolResultContentItem | ImageContentItem | DocumentContentItem;

export interface FileAttachment {
  id: string;
  file: File;
  type: string;
  previewUrl?: string;
  fileId?: string;
}

export interface ZoomedImageState {
  isOpen: boolean;
  imageData: string;
  mimeType: string;
}

export interface Message {
  id: string;
  sender: "user" | "ai";
  contentItems: ContentItem[];
  isStreaming?: boolean;
}

export interface ChatInterfaceProps {
  initialMessage?: string;
  initialAttachments?: FileAttachment[];
}