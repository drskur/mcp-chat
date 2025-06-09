export interface MCPTool {
  name: string;
  description?: string;
  status?: 'ready' | 'error' | 'unknown';
}