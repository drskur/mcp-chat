from mcp.server.fastmcp import FastMCP

# Create an MCP server
mcp = FastMCP("basic-server")


# Add an additional tool
@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b


if __name__ == "__main__":
    mcp.run() 