"""
MCP Client API server main module
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
import os
import logging
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager

# logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# default path and config
BASE_DIR = Path(__file__).resolve().parent
MCP_CONFIG_PATH = os.path.join(BASE_DIR, "config/mcp_config.json")

# MCP service import
from src.mcp_client.mcp_service import MCPService

# MCP service instance creation
mcp_service = MCPService(MCP_CONFIG_PATH)

# Lifespan 이벤트 핸들러 정의
@asynccontextmanager
async def lifespan(app: FastAPI):
    """async context manager for application lifecycle management"""
    # startup event
    logger.info("MCP Client API server starting...")
    try:
        await mcp_service.startup()
        logger.info("MCP service startup complete")
    except Exception as e:
        logger.error(f"MCP service startup error: {str(e)}")
        # server will start but run without MCP service
    
    yield  # this point, the application will run
    
    # shutdown event
    logger.info("MCP Client API server shutting down...")
    try:
        await mcp_service.shutdown()
        logger.info("MCP service shutdown complete")
    except Exception as e:
        logger.error(f"MCP service shutdown error: {str(e)}")

# create default FastAPI app (pass lifespan)
app = FastAPI(title="MCP Client API Server", lifespan=lifespan)

# import routers
from src.routers.agent_router import router as chat_router
from src.routers.mcp_tools_router import router as mcp_tools_router
from src.routers.prompt_router import router as prompt_router
from src.routers.model_router import router as model_router

# add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# register all routers
app.include_router(chat_router)
app.include_router(mcp_tools_router)
app.include_router(prompt_router)
app.include_router(model_router)

# default root path
@app.get("/")
async def root():
    return {"message": "MCP Client API Server"}

# Echo endpoint
class EchoOutput(BaseModel):
    message: str

@app.get("/echo")
def echo(message: str) -> EchoOutput:
    logger.info(f"Echo request received: {message}")
    return EchoOutput(message=f"{message}")

if __name__ == "__main__":
    import uvicorn
    logger.info("MCP Client API server starting...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)