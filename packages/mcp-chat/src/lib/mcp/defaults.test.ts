import { describe, it, expect } from "vitest";
import { applyMCPDefaults, applySingleMCPDefaults, MCP_DEFAULTS } from "./defaults";

describe("MCP Defaults", () => {
  describe("MCP_DEFAULTS", () => {
    it("should have stdio and http transport options", () => {
      expect(MCP_DEFAULTS.stdio).toBe("stdio");
      expect(MCP_DEFAULTS.http).toBe("http");
    });
  });

  describe("applyMCPDefaults", () => {
    it("should apply stdio transport for command-based configs", () => {
      const config = {
        "ddg-search": {
          command: "uvx",
          args: ["duckduckgo-mcp-server"],
        },
        "github-mcp": {
          command: "npx",
          args: ["@modelcontextprotocol/server-github"],
          env: { GITHUB_PERSONAL_ACCESS_TOKEN: "token" },
        },
      };

      const result = applyMCPDefaults(config);

      expect(result["ddg-search"]).toEqual({
        command: "uvx",
        args: ["duckduckgo-mcp-server"],
        transport: "stdio",
      });

      expect(result["github-mcp"]).toEqual({
        command: "npx",
        args: ["@modelcontextprotocol/server-github"],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: "token" },
        transport: "stdio",
      });
    });

    it("should apply http transport for url-based configs", () => {
      const config = {
        "http-server": {
          url: "http://localhost:3000",
        },
        "sse-server": {
          url: "https://api.example.com/mcp",
          headers: { "Authorization": "Bearer token" },
        },
      };

      const result = applyMCPDefaults(config);

      expect(result["http-server"]).toEqual({
        url: "http://localhost:3000",
        transport: "http",
      });

      expect(result["sse-server"]).toEqual({
        url: "https://api.example.com/mcp",
        headers: { "Authorization": "Bearer token" },
        transport: "http",
      });
    });

    it("should preserve existing transport", () => {
      const config = {
        "http-server": {
          url: "http://localhost:3000",
          transport: "http",
        },
      };

      const result = applyMCPDefaults(config);

      expect(result["http-server"]).toEqual({
        url: "http://localhost:3000",
        transport: "http",
      });
    });

    it("should handle mixed configurations", () => {
      const config = {
        "stdio-server": {
          command: "node",
          args: ["server.js"],
        },
        "http-server": {
          url: "http://localhost:3000",
        },
        "explicit-transport": {
          command: "python",
          args: ["server.py"],
          transport: "http", // explicit override
        },
      };

      const result = applyMCPDefaults(config);

      expect(result["stdio-server"].transport).toBe("stdio");
      expect(result["http-server"].transport).toBe("http");
      expect(result["explicit-transport"].transport).toBe("http"); // preserved
    });

    it("should skip invalid configurations", () => {
      const config = {
        "valid-server": {
          command: "node",
          args: ["server.js"],
        },
        "invalid-string": "not-an-object",
        "invalid-null": null,
        "invalid-number": 123,
      };

      const result = applyMCPDefaults(config);

      expect(Object.keys(result)).toEqual(["valid-server"]);
      expect(result["valid-server"].transport).toBe("stdio");
    });

    it("should return empty object for empty input", () => {
      const result = applyMCPDefaults({});
      expect(result).toEqual({});
    });
  });

  describe("applySingleMCPDefaults", () => {
    it("should apply stdio transport for command-based config", () => {
      const config = {
        command: "uvx",
        args: ["duckduckgo-mcp-server"],
      };

      const result = applySingleMCPDefaults(config);

      expect(result).toEqual({
        command: "uvx",
        args: ["duckduckgo-mcp-server"],
        transport: "stdio",
      });
    });

    it("should apply http transport for url-based config", () => {
      const config = {
        url: "http://localhost:3000",
        headers: { "Authorization": "Bearer token" },
      };

      const result = applySingleMCPDefaults(config);

      expect(result).toEqual({
        url: "http://localhost:3000",
        headers: { "Authorization": "Bearer token" },
        transport: "http",
      });
    });

    it("should default to stdio for configs without command or url", () => {
      const config = {
        customProperty: "value",
        args: ["some-arg"],
      };

      const result = applySingleMCPDefaults(config);

      expect(result).toEqual({
        customProperty: "value",
        args: ["some-arg"],
        transport: "stdio",
      });
    });

    it("should preserve existing transport", () => {
      const config = {
        url: "http://localhost:3000",
        transport: "sse", // explicit override
      };

      const result = applySingleMCPDefaults(config);

      expect(result).toEqual({
        url: "http://localhost:3000",
        transport: "sse", // preserved
      });
    });

    it("should throw error for invalid input", () => {
      expect(() => applySingleMCPDefaults(null)).toThrow("Invalid MCP server configuration");
      expect(() => applySingleMCPDefaults("not-an-object")).toThrow("Invalid MCP server configuration");
      expect(() => applySingleMCPDefaults(123)).toThrow("Invalid MCP server configuration");
      expect(() => applySingleMCPDefaults(undefined)).toThrow("Invalid MCP server configuration");
    });

    it("should handle complex configurations", () => {
      const config = {
        command: "python",
        args: ["-m", "mcp_server"],
        env: {
          API_KEY: "secret",
          DEBUG: "true",
        },
        cwd: "/path/to/server",
      };

      const result = applySingleMCPDefaults(config);

      expect(result).toEqual({
        command: "python",
        args: ["-m", "mcp_server"],
        env: {
          API_KEY: "secret",
          DEBUG: "true",
        },
        cwd: "/path/to/server",
        transport: "stdio",
      });
    });
  });
});