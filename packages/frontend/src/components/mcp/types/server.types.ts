import { MCPTool } from './tool.types';

export interface ServerConfig {
  command?: string;
  args?: string[];
  [key: string]: unknown;
}

export interface MCPServer {
  name: string;
  config: ServerConfig;
  status?: 'online' | 'offline' | 'unknown';
  tools?: MCPTool[];
  expanded?: boolean;
}

export interface MCPServerInfo {
  name: string;
  config: ServerConfig;
  status: 'online' | 'offline' | 'unknown';
  tools: MCPTool[];
}