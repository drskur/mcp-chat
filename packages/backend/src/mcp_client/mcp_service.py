"""
MCP service module - manages MCP clients independently.
"""
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from src.common.utils import load_mcp_config
import logging

logger = logging.getLogger(__name__)

class MCPService:
    """
    MCP service class - manages MCP clients and provides tools.
    """
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(MCPService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, config_path: str):
        if self._initialized:
            return
            
        self.config_path = config_path
        self.client = None
        self.tools = None
        self._initialized = True
        self._running = False
        self.server_names = []
        self.server_count = 0
        
    async def startup(self):
        """call once when app starts to start MCP servers"""
        if self._running:
            logger.info(f"MCPService: already running (servers: {self.server_count}, tools: {len(self.tools)})")
            return self.tools
            
        logger.info("MCPService: loading config file")
        mcp_config = await load_mcp_config(self.config_path)
        mcp_tools = mcp_config.get("mcpServers", {})
        self.server_count = len(mcp_tools)

        # logging server names
        self.server_names = list(mcp_tools.keys())
        logger.info(f"MCPService: configured server list - {', '.join(self.server_names)}")

        logger.info(f"MCPService: starting {self.server_count} MCP servers...")
        self.client = MultiServerMCPClient(mcp_tools)
        await self.client.__aenter__()      # 내부적으로 서버 프로세스들 실행
        self.tools = self.client.get_tools()
        
        # logging tool count
        tool_count = len(self.tools)
        logger.debug(f"MCPService: loaded {tool_count} tools from {self.server_count} MCP servers")
        
        # logging tool names
        if tool_count > 0:
            tool_names = []
            for tool in self.tools:
                if hasattr(tool, "name"):
                    tool_names.append(tool.name)
            
            logger.debug(f"MCPService: loaded tool list - {', '.join(sorted(tool_names))}")
        
        self._running = True
        logger.info("MCPService: server startup complete")
        
        return self.tools

    async def shutdown(self):
        """call when app shuts down to stop MCP servers"""
        if self.client and self._running:
            logger.info(f"MCPService: shutting down {self.server_count} servers...")
            await self.client.__aexit__(None, None, None)
            self._running = False
            logger.info("MCPService: server shutdown complete")

    def get_servers(self):
        """return current registered MCP server list"""
        return self.server_names
            
    def get_tools(self):
        """return current registered MCP tools list"""
        if not self._running:
            logger.warning("MCPService: servers are not running. no tools available.")
            return []
        return self.tools

    def get_client(self):
        """return current MultiServerMCPClient instance"""
        if not self._running:
            logger.warning("MCPService: servers are not running. no client available.")
            return None
        return self.client