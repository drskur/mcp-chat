export interface MCPToolStatus {
    name: string;
    description: string;
}

export interface MCPServerStatus {
    name: string;
    status: "online" | "offline"
    tools: MCPToolStatus[]
    collapse: boolean;
}