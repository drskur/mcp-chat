/**
 * MCP Server Action Types
 * 
 * These types define the structure of server action responses and payloads.
 */

import { MCPServerInfo } from './server.types';

/**
 * Result of a restart operation
 */
export interface RestartResult {
  success: boolean;
  message: string;
}

/**
 * Standard response from server actions
 */
export interface ServerActionResponse {
  message: string;
  restart?: RestartResult;
}

/**
 * Server action result wrapper for error handling
 */
export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Response for getMCPTools action
 */
export interface GetMCPToolsResponse {
  servers: MCPServerInfo[];
}

/**
 * Payload for adding an MCP tool/server
 */
export interface AddMCPToolPayload {
  name: string;
  config: Record<string, unknown>;
}

/**
 * Payload for updating an MCP tool/server
 */
export interface UpdateMCPToolPayload {
  name: string;
  config: Record<string, unknown>;
}