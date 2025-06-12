/**
 * MCP Tool Types
 * 
 * These types define the structure of MCP tools used throughout the application.
 */

export interface MCPTool {
  name: string;
  description?: string;
  status?: 'ready' | 'error' | 'unknown';
}