from typing import Dict, Optional
from langchain_core.runnables import RunnableConfig

class Configuration:
    """class for agent configuration"""
    
    def __init__(
        self,
        system_prompt: str = "You are a helpful AI assistant. The current time is {system_time}.",
        mcp_tools: str = "./config/mcp_config.json",
    ):
        """initialize function
        
        Args:
            system_prompt: system prompt template string
            mcp_tools: MCP tools configuration file path
        """
        self.system_prompt = system_prompt
        self.mcp_tools = mcp_tools
    
    @classmethod
    def from_runnable_config(cls, config: RunnableConfig) -> "Configuration":
        """create Configuration instance from RunnableConfig
        
        Args:
            config: RunnableConfig object
            
        Returns:
            Configuration instance
        """
        config_dict = config.get("configurable", {})
        return cls(
            system_prompt=config_dict.get("system_prompt", "You are a helpful AI assistant. The current time is {system_time}."),
            mcp_tools=config_dict.get("mcp_tools", "./config/mcp_config.json"),
        )