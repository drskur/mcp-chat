"""
MCP Tools Management API Router
"""
import json
import logging
import os
import asyncio
from typing import Dict, Any, Optional, List
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from src.mcp_client.mcp_service import MCPService

# Current parent directory
BASE_DIR = Path(__file__).resolve().parent.parent

# logging configuration
logger = logging.getLogger(__name__)

# MCP config file path
MCP_CONFIG_PATH = os.getenv("MCP_CONFIG_PATH", os.path.join(BASE_DIR, "../config/mcp_config.json"))

# create router
router = APIRouter(prefix="/api/mcp-tools", tags=["mcp-tools"])

# request and response models
class MCPToolConfig(BaseModel):
    """MCP tool config model"""
    name: str
    config: Dict[str, Any]

class MCPToolsResponse(BaseModel):
    """MCP tool list response model"""
    tools: Dict[str, Any]

class MCPToolInfo(BaseModel):
    """MCP tool info model"""
    name: str
    description: Optional[str] = None
    status: Optional[str] = "ready"

class MCPServerInfo(BaseModel):
    """MCP server info model"""
    name: str
    status: str
    config: Dict[str, Any]
    tools: List[MCPToolInfo]

class MCPCompleteInfoResponse(BaseModel):
    """MCP all server and tool info response model"""
    servers: List[MCPServerInfo]

class MCPRestartResponse(BaseModel):
    """MCP restart response model"""
    success: bool
    message: str

# 재시작 락 변수 추가 (동시 여러 요청에서 재시작을 시도하는 것을 방지)
_restart_lock = asyncio.Lock()
_is_restarting = False

# get MCP service instance
def get_mcp_service():
    """get MCP service instance"""
    service = MCPService(MCP_CONFIG_PATH)
    return service

def load_mcp_config() -> Dict[str, Any]:
    """
    load MCP config file
    
    Returns:
        Dict: MCP config data
    """
    try:
        if os.path.exists(MCP_CONFIG_PATH):
            with open(MCP_CONFIG_PATH, "r") as f:
                config = json.load(f)
                
            # check structure and initialize
            if "mcpServers" not in config:
                config["mcpServers"] = {}
                
            return config
        else:
            # if file not exists, create default structure
            return {"mcpServers": {}}
    except Exception as e:
        logger.error(f"MCP config load error: {e}")
        return {"mcpServers": {}}

def save_mcp_config(config: Dict[str, Any]) -> bool:
    """
    save MCP config file
    
    Args:
        config: data to save
        
    Returns:
        bool: save success or not
    """
    try:
        # check directory and create
        os.makedirs(os.path.dirname(MCP_CONFIG_PATH), exist_ok=True)
        
        # save config
        with open(MCP_CONFIG_PATH, "w") as f:
            json.dump(config, f, indent=2)
            
        return True
    except Exception as e:
        logger.error(f"MCP config save error: {e}")
        return False

async def restart_mcp_service(mcp_service: MCPService) -> Dict[str, Any]:
    """
    MCP 서비스를 재시작합니다.
    
    Args:
        mcp_service: MCP 서비스 인스턴스
        
    Returns:
        Dict: 재시작 결과
    """
    global _is_restarting
    
    # 이미 재시작 중인 경우 중복 실행 방지
    async with _restart_lock:
        if _is_restarting:
            return {
                "success": False, 
                "message": "다른 요청에 의해 MCP 서비스가 이미 재시작 중입니다. 잠시 후 다시 시도해주세요."
            }
        _is_restarting = True
    
    try:
        logger.info("MCP 서비스 재시작 시도")
        
        # 실제로 서비스를 재시작하기 위해 완전히 종료하고 다시 시작
        try:
            logger.info("MCP 서비스 종료 중...")
            if mcp_service._running:
                await mcp_service.shutdown()
                logger.info("MCP 서비스 종료 완료")
            else:
                logger.info("MCP 서비스가 실행 중이지 않아 종료 과정을 건너뜁니다.")
        except Exception as e:
            logger.error(f"MCP 서비스 종료 중 오류 발생: {e}")
            # 오류가 발생해도 계속 진행 - 시작 시도
        
        # 잠시 대기 (서비스 종료 후 안정화 시간)
        await asyncio.sleep(1.0)
        
        # 서비스 다시 시작
        logger.info("MCP 서비스 시작 중...")
        await mcp_service.startup()
        
        server_count = len(mcp_service.server_names)
        tool_count = len(mcp_service.tools) if mcp_service.tools else 0
        
        logger.info(f"MCP 서비스 시작 완료 (서버 {server_count}개, 도구 {tool_count}개)")
        
        return {
            "success": True, 
            "message": f"MCP 서비스가 성공적으로 재시작되었습니다. {server_count}개 서버와 {tool_count}개 도구가 활성화되었습니다."
        }
    except Exception as e:
        logger.error(f"MCP 서비스 재시작 중 오류 발생: {e}")
        return {"success": False, "message": f"MCP 서비스 재시작 실패: {str(e)}"}
    finally:
        # 재시작 상태 해제
        async with _restart_lock:
            _is_restarting = False

@router.get("", response_model=MCPCompleteInfoResponse)
async def get_mcp_tools(mcp_service: MCPService = Depends(get_mcp_service)):
    """
    get MCP server and tool list
    
    Returns:
        MCPCompleteInfoResponse: response with all server and tool info
    """
    try:
        logger.info("MCP tool list get API called")
        
        # get server list from config file
        config = load_mcp_config()
        mcpServers = config.get("mcpServers", {})
        
        # list to contain server info
        server_infos = []
        
        # check if MCP service is running
        is_service_running = mcp_service._running
        
        if not is_service_running:
            logger.warning("MCP service is not running. return offline info only.")
        
        # list of running servers (only if service is running)
        running_servers = mcp_service.get_servers() if is_service_running else []
        
        # list of tools (only if service is running)
        all_tools_dict = {}
        
        if is_service_running:
            # get server-specific tool info from MCP client
            client = mcp_service.get_client()
            if client and hasattr(client, 'server_name_to_tools'):
                all_tools_dict = client.server_name_to_tools
                logger.debug(f"get server-specific tool list: {list(all_tools_dict.keys())}") 
                
                # log number of tools for each server
                for server_name, tools_list in all_tools_dict.items():
                    logger.debug(f"server '{server_name}' has {len(tools_list)} tools")
        
        # configure info for each server in config file
        for server_name, server_config in mcpServers.items():
            server_status = "offline"
            server_tools = []
            
            # check if server is running
            if is_service_running and server_name in running_servers:
                server_status = "online"
                
                # get tool list for the server
                if server_name in all_tools_dict:
                    tools_list = all_tools_dict.get(server_name, [])
                    
                    # configure tool info
                    for tool in tools_list:
                        if not hasattr(tool, "name"):
                            continue
                            
                        # extract tool name and description
                        name = tool.name
                        description = ""
                        if hasattr(tool, "description"):
                            description = tool.description
                            
                        # add tool info
                        server_tools.append(MCPToolInfo(
                            name=name,
                            description=description,
                            status="ready"
                        ))
                    
                    logger.debug(f"server '{server_name}' has {len(server_tools)} tools in response")
            
            # add server info
            server_infos.append(MCPServerInfo(
                name=server_name,
                status=server_status,
                config=server_config,
                tools=server_tools
            ))
        
        logger.info(f"MCP tool list get completed: {len(server_infos)} servers")
        return MCPCompleteInfoResponse(servers=server_infos)
    except Exception as e:
        logger.error(f"MCP tool list get error: {e}")
        raise HTTPException(status_code=500, detail=f"failed to get tool list: {str(e)}")

@router.post("")
async def add_mcp_tool(tool: MCPToolConfig, mcp_service: MCPService = Depends(get_mcp_service)):
    """
    add MCP tool
    
    Args:
        tool: tool info to add
        
    Returns:
        Dict: success message
    """
    try:
        config = load_mcp_config()
        
        # check if tool name already exists
        if tool.name in config["mcpServers"]:
            raise HTTPException(status_code=400, detail=f"tool name already exists: {tool.name}")
        
        # add tool
        config["mcpServers"][tool.name] = tool.config
        
        # save config
        if not save_mcp_config(config):
            raise HTTPException(status_code=500, detail="failed to save tool config")
        
        # 서비스 재시작
        restart_result = await restart_mcp_service(mcp_service)
        if restart_result["success"]:
            logger.info(f"MCP 서비스 재시작 성공: {tool.name} 추가 후")
            return {"message": f"tool added successfully: {tool.name}", "restart": restart_result}
        else:
            logger.warning(f"MCP 서비스 재시작 실패: {restart_result['message']}")
            return {"message": f"tool added successfully: {tool.name}, but service restart failed", "restart": restart_result}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MCP tool add error: {e}")
        raise HTTPException(status_code=500, detail=f"failed to add tool: {str(e)}")

@router.delete("/{tool_name}")
async def delete_mcp_tool(tool_name: str, mcp_service: MCPService = Depends(get_mcp_service)):
    """
    delete MCP tool
    
    Args:
        tool_name: tool name to delete
        
    Returns:
        Dict: success message
    """
    try:
        config = load_mcp_config()
        
        # check if tool exists
        if tool_name not in config["mcpServers"]:
            raise HTTPException(status_code=404, detail=f"tool not found: {tool_name}")
        
        # delete tool
        del config["mcpServers"][tool_name]
        
        # save config
        if not save_mcp_config(config):
            raise HTTPException(status_code=500, detail="failed to save tool config")
        
        # 서비스 재시작
        restart_result = await restart_mcp_service(mcp_service)
        if restart_result["success"]:
            logger.info(f"MCP 서비스 재시작 성공: {tool_name} 삭제 후")
            return {"message": f"tool deleted successfully: {tool_name}", "restart": restart_result}
        else:
            logger.warning(f"MCP 서비스 재시작 실패: {restart_result['message']}")
            return {"message": f"tool deleted successfully: {tool_name}, but service restart failed", "restart": restart_result}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MCP tool delete error: {e}")
        raise HTTPException(status_code=500, detail=f"failed to delete tool: {str(e)}")

@router.put("/{tool_name}")
async def update_mcp_tool(tool_name: str, updated_tool: MCPToolConfig, mcp_service: MCPService = Depends(get_mcp_service)):
    """
    update MCP tool
    
    Args:
        tool_name: tool name to update
        updated_tool: updated tool info
        
    Returns:
        Dict: success message
    """
    try:
        logger.info(f"MCP tool update request: {tool_name}")
        config = load_mcp_config()
        
        # check if tool exists
        if tool_name not in config["mcpServers"]:
            raise HTTPException(status_code=404, detail=f"tool not found: {tool_name}")
            
        # if tool name is changed
        if tool_name != updated_tool.name:
            logger.info(f"tool name changed: {tool_name} -> {updated_tool.name}")
            
            # check if new name is already exists
            if updated_tool.name in config["mcpServers"]:
                raise HTTPException(status_code=400, detail=f"tool name already exists: {updated_tool.name}")
                
            # delete old item
            del config["mcpServers"][tool_name]
            
            # add new item
            config["mcpServers"][updated_tool.name] = updated_tool.config
        else:
            # update config
            config["mcpServers"][tool_name] = updated_tool.config
            
        # save config
        if not save_mcp_config(config):
            raise HTTPException(status_code=500, detail="failed to save tool config")
        
        # 서비스 재시작
        restart_result = await restart_mcp_service(mcp_service)
        if restart_result["success"]:
            logger.info(f"MCP 서비스 재시작 성공: {updated_tool.name} 업데이트 후")
            return {"message": f"tool updated successfully: {updated_tool.name}", "restart": restart_result}
        else:
            logger.warning(f"MCP 서비스 재시작 실패: {restart_result['message']}")
            return {"message": f"tool updated successfully: {updated_tool.name}, but service restart failed", "restart": restart_result}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MCP tool update error: {e}")
        raise HTTPException(status_code=500, detail=f"failed to update tool: {str(e)}")

@router.post("/restart", response_model=MCPRestartResponse)
async def restart_mcp(mcp_service: MCPService = Depends(get_mcp_service)):
    """
    MCP 서비스를 수동으로 재시작합니다.
    
    Returns:
        MCPRestartResponse: 재시작 결과
    """
    try:
        logger.info("MCP 서비스 수동 재시작 요청")
        restart_result = await restart_mcp_service(mcp_service)
        
        return MCPRestartResponse(
            success=restart_result["success"],
            message=restart_result["message"]
        )
    except Exception as e:
        logger.error(f"MCP 서비스 수동 재시작 오류: {e}")
        return MCPRestartResponse(
            success=False,
            message=f"MCP 서비스 재시작 실패: {str(e)}"
        ) 