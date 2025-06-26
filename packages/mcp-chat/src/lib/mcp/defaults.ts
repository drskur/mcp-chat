import type { Connection } from "@langchain/mcp-adapters";

/**
 * MCP 서버 설정의 기본값
 */
export const MCP_DEFAULTS = {
  stdio: "stdio" as const,
  http: "http" as const,
} as const;

/**
 * 설정 객체를 기반으로 적절한 기본 transport를 결정합니다.
 * - command 프로퍼티가 있으면 "stdio"
 * - url 프로퍼티가 있으면 "http"
 * - 둘 다 없으면 "stdio" (fallback)
 */
function getDefaultTransport(config: Record<string, unknown>): string {
  if ("command" in config) {
    return MCP_DEFAULTS.stdio;
  }
  if ("url" in config) {
    return MCP_DEFAULTS.http;
  }
  return MCP_DEFAULTS.stdio; // fallback
}

/**
 * MCP 서버 설정에 기본값을 적용합니다.
 * 주로 transport 필드가 누락된 경우 기본값을 채워줍니다.
 *
 * @param config - MCP 서버 설정 객체
 * @returns 기본값이 적용된 설정 객체
 */
export function applyMCPDefaults(
  config: Record<string, unknown>,
): Record<string, Connection> {
  const result: Record<string, Connection> = {};

  for (const [serverName, serverConfig] of Object.entries(config)) {
    if (typeof serverConfig !== "object" || serverConfig === null) {
      continue;
    }

    // transport가 없으면 기본값 적용
    const configTyped = serverConfig as Record<string, unknown>;
    const configWithDefaults = {
      ...configTyped,
      transport: configTyped.transport ?? getDefaultTransport(configTyped),
    };

    result[serverName] = configWithDefaults as Connection;
  }

  return result;
}

/**
 * 단일 MCP 서버 설정에 기본값을 적용합니다.
 *
 * @param serverConfig - 단일 MCP 서버 설정
 * @returns 기본값이 적용된 설정
 */
export function applySingleMCPDefaults(serverConfig: unknown): Connection {
  if (typeof serverConfig !== "object" || serverConfig === null) {
    throw new Error("Invalid MCP server configuration");
  }

  const config = serverConfig as Record<string, unknown>;

  return {
    ...config,
    transport: config.transport ?? getDefaultTransport(config),
  } as Connection;
}
