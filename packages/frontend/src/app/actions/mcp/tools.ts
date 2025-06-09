'use server';

import type {
  ActionResult,
  GetMCPToolsResponse,
  AddMCPToolPayload,
  UpdateMCPToolPayload,
  ServerActionResponse,
  RestartResult
} from '@/types/mcp';

/**
 * Get list of MCP servers and their tools
 *
 * @returns Promise with servers list or error
 */
export async function getMCPTools(): Promise<ActionResult<GetMCPToolsResponse>> {
  try {
    // TODO: Replace with actual backend API call
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mcp-tools`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch MCP tools: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data as GetMCPToolsResponse,
    };
  } catch (error) {
    console.error('Error fetching MCP tools:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch MCP tools',
    };
  }
}

/**
 * Add a new MCP server/tool
 *
 * @param payload - Server name and configuration
 * @returns Promise with operation result
 */
export async function addMCPTool(payload: AddMCPToolPayload): Promise<ActionResult<ServerActionResponse>> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mcp-tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to add MCP tool: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data as ServerActionResponse,
    };
  } catch (error) {
    console.error('Error adding MCP tool:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add MCP tool',
    };
  }
}

/**
 * Update an existing MCP server/tool
 *
 * @param toolName - Current name of the server/tool
 * @param payload - New name and configuration
 * @returns Promise with operation result
 */
export async function updateMCPTool(
  toolName: string,
  payload: UpdateMCPToolPayload
): Promise<ActionResult<ServerActionResponse>> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mcp-tools/${encodeURIComponent(toolName)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to update MCP tool: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data as ServerActionResponse,
    };
  } catch (error) {
    console.error('Error updating MCP tool:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update MCP tool',
    };
  }
}

/**
 * Delete an MCP server/tool
 *
 * @param toolName - Name of the server/tool to delete
 * @returns Promise with operation result
 */
export async function deleteMCPTool(toolName: string): Promise<ActionResult<ServerActionResponse>> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mcp-tools/${encodeURIComponent(toolName)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to delete MCP tool: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data as ServerActionResponse,
    };
  } catch (error) {
    console.error('Error deleting MCP tool:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete MCP tool',
    };
  }
}

/**
 * Restart MCP service
 *
 * @returns Promise with restart result
 */
export async function restartMCPService(): Promise<ActionResult<RestartResult>> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mcp-tools/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to restart MCP service: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data as RestartResult,
    };
  } catch (error) {
    console.error('Error restarting MCP service:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restart MCP service',
    };
  }
}