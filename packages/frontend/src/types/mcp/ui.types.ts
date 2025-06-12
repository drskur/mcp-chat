/**
 * MCP UI Component Types
 *
 * Type definitions for MCP-related UI components
 */

import type { MCPServerInfo, ServerConfig, MCPTool, ServerActionResponse } from './index';

export interface MCPToolManagerProps {
  onSettingsChanged?: () => void;
  agentName?: string;
}

export interface ServerCardProps {
  server: MCPServerInfo;
  onEdit: (config: ServerConfig) => void;
  onRemove: () => void;
  onRestart: () => void;
}

export interface ToolsListProps {
  tools: MCPTool[];
  serverId: string;
}

export interface JsonModeViewProps {
  tools: MCPTool[];
  servers: MCPServerInfo[];
}

export interface EmptyServerStateProps {
  onAddServer?: () => void;
}

export interface ServerStatusIconProps {
  status: 'connected' | 'disconnected' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export interface ResultNotificationProps {
  result: ServerActionResponse;
  onClose?: () => void;
}