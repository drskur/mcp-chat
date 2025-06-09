export interface RestartResult {
  success: boolean;
  message: string;
}

export interface ServerActionResponse {
  message: string;
  restart?: RestartResult;
}

export interface MCPToolManagerProps {
  onSettingsChanged?: () => void;
}