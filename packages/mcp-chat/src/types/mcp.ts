export interface MCPToolStatus {
  name: string;
  description: string;
}

export interface MCPServerConnectionStatus {
  success: boolean;
  error?: string;
  authUrl?: string;
  isPending?: boolean;
}

export interface MCPServerStatus {
  name: string;
  tools: MCPToolStatus[];
  collapse: boolean;
  connectionStatus: MCPServerConnectionStatus;
}

export interface AuthProviderProps {
  redirectUrl: string;
  clientId: string;
}
