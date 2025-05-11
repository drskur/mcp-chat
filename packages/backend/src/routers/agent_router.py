"""
Agent API router
"""
import json
import logging
import os
import yaml
from typing import Dict, Any, Optional, List, Union

from fastapi import APIRouter, HTTPException, Request, Form, File, UploadFile, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage
from langchain_core.runnables.config import RunnableConfig
from pathlib import Path
from src.agent.react_agent import ReactAgent
from src.agent.react_agent.state.model import InputState
from src.common.configuration import Configuration
from src.mcp_client.mcp_service import MCPService

# logging configuration
logger = logging.getLogger(__name__)

# create router
router = APIRouter(prefix="/api", tags=["chat"])

# model configuration file path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_CONFIG_PATH = os.path.join(BASE_DIR, "config/models.yaml")
USER_SETTINGS_DIR = os.path.expanduser("~/.mcp-client")
USER_MODEL_FILE = os.path.join(USER_SETTINGS_DIR, "pace_mcp_client.json")
MCP_CONFIG_PATH = os.path.join(BASE_DIR, "config/mcp_config.json")

# initialize global agent variable
agent = None

# request and response model
class ChatRequest(BaseModel):
    """chat request model"""
    message: str
    stream: bool = True
    model_id: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"

# attachment file information model
class FileInfo(BaseModel):
    """attachment file information model"""
    name: str
    type: str
    data: Union[str, bytes]
    size: int

class ReinitRequest(BaseModel):
    """agent reinitialization request model"""
    model_id: Optional[str] = None
    reload_prompt: Optional[bool] = False

class ReinitResponse(BaseModel):
    """agent reinitialization response model"""
    success: bool
    model_id: str
    max_tokens: int
    message: str

class ToolCall(BaseModel):
    """tool call model"""
    name: str
    input: Dict[str, Any]

class ChatResponse(BaseModel):
    """chat response model"""
    response: str
    tool_calls: Optional[List[ToolCall]] = None


def get_user_model() -> str:
    """load user model"""
    try:
        if not os.path.exists(USER_MODEL_FILE):
            logger.debug("user model setting not found, return default value")
            return "anthropic.claude-3-5-sonnet-20241022-v2:0"
        
        with open(USER_MODEL_FILE, "r") as f:
            data = json.load(f)
            model_id = data.get("model_id", "anthropic.claude-3-5-sonnet-20241022-v2:0")
            logger.debug(f"user model load success: {model_id}")
            return model_id
    except Exception as e:
        logger.error(f"user model load failed: {e}")
        return "anthropic.claude-3-5-sonnet-20241022-v2:0"

def load_model_config(model_id: str) -> Dict[str, Any]:
    """load model configuration"""
    try:
        if not os.path.exists(MODELS_CONFIG_PATH):
            logger.error(f"model configuration file not found: {MODELS_CONFIG_PATH}")
            return {"max_output_tokens": 4096}
        
        with open(MODELS_CONFIG_PATH, "r") as f:
            models_config = yaml.safe_load(f)
        
        # search model configuration
        for provider_id, provider_data in models_config.get("providers", {}).items():
            for model_config_id, model_data in provider_data.get("models", {}).items():
                if model_data.get("id") == model_id:
                    logger.debug(f"model configuration load success: {model_id}")
                    return model_data
        
        logger.warning(f"no configuration found for specified model ID: {model_id}")
        return {"max_output_tokens": 4096}
    except Exception as e:
        logger.error(f"model configuration load failed: {e}")
        return {"max_output_tokens": 4096}

@router.post("/chat")
async def chat(
    request: Request,
    message: str = Form(None),
    stream: bool = Form(True),
    model_id: str = Form("anthropic.claude-3-5-sonnet-20241022-v2:0"),
    files: List[UploadFile] = File(None)
):
    """
    chat API endpoint
    
    Args:
        request: HTTP request
        message: user message text
        stream: streaming response flag
        model_id: model ID to use
        files: list of attachment files
        
    Returns:
        chat response or streaming response
    """
    try:
        # check if request is JSON or FormData
        content_type = request.headers.get("content-type", "")
        logger.info(f"request Content-Type: {content_type}")
        
        # handle JSON request
        if "application/json" in content_type:
            request_data = await request.json()
            message = request_data.get("message", "")
            stream = request_data.get("stream", True)
            model_id = request_data.get("model_id", "anthropic.claude-3-5-sonnet-20241022-v2:0")
            files_data = None
            logger.info(f"JSON request processing: message length={len(message)}, streaming={stream}, model={model_id}")
        
        # handle multipart/form-data request
        processed_files = []
        if files:
            logger.info(f"file upload detected: {len(files)} files")
            for file in files:
                if file.filename:
                    try:
                        # read file content
                        file_data = await file.read()
                        file_size = len(file_data)
                        
                        logger.info(f"file read success: {file.filename} ({file_size / 1024:.2f} KB, {file.content_type})")
                        
                        # create file information
                        file_info = {
                            "name": file.filename,
                            "type": file.content_type or "",
                            "data": file_data,
                            "size": file_size
                        }
                        
                        processed_files.append(file_info)
                        logger.info(f"file added: {file.filename} ({file_size / 1024:.2f} KB)")
                    except Exception as e:
                        logger.error(f"file processing error: {file.filename}, error: {str(e)}")
                        import traceback
                        logger.error(f"detailed error: {traceback.format_exc()}")
                        raise HTTPException(status_code=400, detail=f"error occurred during file upload: {file.filename}")
        
        # validate message
        if not message and not processed_files:
            logger.warning("message and attachment files are both empty")
            raise HTTPException(status_code=400, detail="message or attachment files are required")
        
        # check model ID
        if not model_id:
            model_id = get_user_model()
            logger.info(f"use default model ID: {model_id}")
        
        # load model configuration
        model_config = load_model_config(model_id)
        max_tokens = model_config.get("max_output_tokens", 4096)
        logger.info(f"model configuration load: {model_id}, max_tokens={max_tokens}")
        
        # initialize agent
        global agent
        if 'agent' not in globals() or not agent:
            logger.info(f"agent initialization: model ID={model_id}, max_tokens={max_tokens}")
            agent = ReactAgent(model_id=model_id, max_tokens=max_tokens, mcp_json_path=MCP_CONFIG_PATH)
        
        # create message
        messages = [HumanMessage(content=message)]
        
        thread_id = f"thread_{id(request)}"
        logger.info(f"create thread ID: {thread_id}")

        # create execution configuration
        config = RunnableConfig(
            configurable={
                "Configuration": Configuration(
                    mcp_tools=MCP_CONFIG_PATH,
                ),
                "thread_id": thread_id
            }
        )
        
        # create input state
        input_state = InputState(messages=messages)
        
        # handle streaming response
        if stream:
            logger.info("streaming response processing")
            
            async def stream_response():
                """streaming response generator"""
                # track previous metadata state
                prev_metadata = {
                    "langgraph_node": "",
                    "langgraph_step": -1,
                    "type": ""
                }
                
                # track accumulated text (per node)
                accumulated_text = {}
                current_node_texts = {}
                
                # variables for tracking current step and node
                current_node = ""
                current_step = 0
                
                try:
                    logger.info(f"agent.astream call: files={len(processed_files)} files")
                    async for chunk, metadata in agent.astream(
                        input_state,
                        config,
                        stream_mode="messages",
                        files=processed_files
                    ):
                        # extract metadata (use default value if not found)
                        current_node = metadata.get("langgraph_node", current_node or "unknown")
                        current_step = metadata.get("langgraph_step", current_step or 0)
                        
                        # current metadata configuration
                        current_type = ""
                        
                        # infer type based on node
                        if current_node == "agent":
                            current_type = "ai_response"
                        elif current_node == "tools":
                            current_type = "tool_result"
                        else:
                            current_type = "unknown"
                        
                        # metadata can be changed during message processing, so update with current value
                        current_metadata = {
                            "langgraph_node": current_node,
                            "langgraph_step": current_step,
                            "type": current_type
                        }
                        
                        # detect node change (new step start)
                        node_changed = (
                            current_node != prev_metadata["langgraph_node"] or
                            current_step != prev_metadata["langgraph_step"]
                        )
                        
                        # create node key
                        node_key = f"{current_step}-{current_node}"
                        
                        # manage accumulated text for current node
                        if node_key not in current_node_texts:
                            current_node_texts[node_key] = ""
                            # initialize accumulated text for new node
                            accumulated_text[node_key] = ""
                        
                        # process message chunk
                        if hasattr(chunk, "content") and chunk.content:
                            response_content = chunk.content
                            
                            # handle image data in metadata
                            if metadata.get("is_image", False) and metadata.get("image_data"):
                                current_metadata["type"] = "image"
                                
                                response_data = {
                                    "chunk": [{
                                        "type": "image",
                                        "image_data": metadata["image_data"],
                                        "mime_type": metadata.get("mime_type", "image/png"),
                                        "index": 0
                                    }],
                                    "toolCalls": None,
                                    "metadata": current_metadata
                                }
                                
                                # update metadata state
                                prev_metadata = current_metadata.copy()
                                
                                yield f"data: {json.dumps(response_data)}\n\n"
                                continue
                            
                            # handle list content (advanced streaming format)
                            if isinstance(response_content, list):
                                for item in response_content:
                                    if isinstance(item, dict):
                                        item_type = item.get("type", "")
                                        
                                        # update current metadata type based on message type
                                        if item_type == "text":
                                            current_type = "ai_response"
                                        elif item_type == "tool_use":
                                            current_type = "tool_use"
                                        elif item_type == "tool_result":
                                            current_type = "tool_result"
                                        
                                        # update current metadata
                                        current_metadata["type"] = current_type
                                        
                                        # handle text type
                                        if item_type == "text":
                                            # update current node text
                                            current_node_texts[node_key] += item.get("text", "")
                                            
                                            response_data = {
                                                "chunk": [item],
                                                "toolCalls": None,
                                                "metadata": current_metadata
                                            }
                                            
                                            # update accumulated text
                                            accumulated_text[node_key] = current_node_texts[node_key]
                                            
                                            # update metadata state
                                            prev_metadata = current_metadata.copy()
                                            
                                            yield f"data: {json.dumps(response_data)}\n\n"
                                        
                                        # handle tool use
                                        elif item_type == "tool_use":
                                            response_data = {
                                                "chunk": [item],
                                                "toolCalls": None,
                                                "metadata": current_metadata
                                            }
                                            
                                            # update metadata state
                                            prev_metadata = current_metadata.copy()
                                            
                                            yield f"data: {json.dumps(response_data)}\n\n"
                                        
                                        # handle tool result
                                        elif item_type == "tool_result":
                                            response_data = {
                                                "chunk": [item],
                                                "toolCalls": None,
                                                "metadata": current_metadata
                                            }
                                            
                                            # update metadata state
                                            prev_metadata = current_metadata.copy()
                                            
                                            yield f"data: {json.dumps(response_data)}\n\n"
                            
                            # handle tool result (string)
                            elif isinstance(response_content, str):
                                # update current node text
                                if node_key not in current_node_texts:
                                    current_node_texts[node_key] = ""
                                    # initialize accumulated text for new node
                                    accumulated_text[node_key] = ""
                                
                                current_node_texts[node_key] += response_content
                                
                                # handle tool node
                                if current_node == "tools":
                                    current_metadata["type"] = "tool_result"
                                    
                                    # convert tool result (string) to text item format
                                    response_data = {
                                        "chunk": [{
                                            "type": "tool_result",
                                            "text": response_content,
                                            "index": 0
                                        }],
                                        "toolCalls": None,
                                        "metadata": current_metadata
                                    }
                                else:
                                    # convert string to text item format
                                    response_data = {
                                        "chunk": [{
                                            "type": "text",
                                            "text": response_content,
                                            "index": 0
                                        }],
                                        "toolCalls": None,
                                        "metadata": current_metadata
                                    }
                                
                                # update accumulated text
                                accumulated_text[node_key] = current_node_texts[node_key]
                                
                                # update metadata state
                                prev_metadata = current_metadata.copy()
                                
                                yield f"data: {json.dumps(response_data)}\n\n"
                            
                            # handle tool call
                            elif hasattr(chunk, "tool_calls") and chunk.tool_calls:
                                # send tool calls if any
                                tool_calls = []
                                for tool_call in chunk.tool_calls:
                                    tool_calls.append({
                                        "name": tool_call.get("name", ""),
                                        "input": tool_call.get("args", {})
                                    })
                                
                                # set tool call metadata
                                current_metadata["type"] = "tool_use"
                                
                                # convert tool call information to tool use item
                                tool_use_items = []
                                for i, tool_call in enumerate(tool_calls):
                                    tool_use_items.append({
                                        "type": "tool_use",
                                        "name": tool_call["name"],
                                        "input": json.dumps(tool_call["input"]),
                                        "id": f"tooluse_{i}",
                                        "index": i
                                    })
                                
                                response_data = {
                                    "chunk": tool_use_items,
                                    "toolCalls": None,
                                    "metadata": current_metadata
                                }
                                
                                # update metadata state
                                prev_metadata = current_metadata.copy()
                                
                                yield f"data: {json.dumps(response_data)}\n\n"
                        
                        # handle case where message content is empty but metadata is present (step transition, etc.)
                        elif metadata:
                            # send empty message with only metadata
                            response_data = {
                                "chunk": [],
                                "toolCalls": None,
                                "metadata": current_metadata
                            }
                            
                            # update metadata state
                            prev_metadata = current_metadata.copy()
                            
                            yield f"data: {json.dumps(response_data)}\n\n"
                
                except Exception as e:
                    logger.error(f"streaming processing error: {e}")
                    import traceback
                    logger.error(f"detailed stack trace: {traceback.format_exc()}")
                    error_data = {
                        "error": str(e),
                        "metadata": {
                            "langgraph_node": "error",
                            "langgraph_step": current_step,
                            "type": "error"
                        }
                    }
                    yield f"data: {json.dumps(error_data)}\n\n"
                
                # streaming end signal
                yield "data: [DONE]\n\n"
                logger.info("streaming response completed")
            
            return StreamingResponse(
                stream_response(),
                media_type="text/event-stream"
            )
        
        # handle normal response (non-streaming)
        else:
            logger.info("normal response processing")
            response = await agent.ainvoke(input_state, config, files=processed_files)
            
            # extract response message
            if "messages" in response and response["messages"]:
                last_message = response["messages"][-1]
                response_content = last_message.content if hasattr(last_message, "content") else ""
                
                # extract tool call information
                tool_calls = []
                if hasattr(last_message, "tool_calls") and last_message.tool_calls:
                    for tool_call in last_message.tool_calls:
                        tool_calls.append({
                            "name": tool_call.get("name", ""),
                            "input": tool_call.get("args", {})
                        })
                
                return ChatResponse(
                    response=response_content,
                    tool_calls=tool_calls if tool_calls else None
                )
            else:
                return ChatResponse(response="unable to generate response")
    
    except Exception as e:
        logger.error(f"chat processing error: {e}")
        import traceback
        logger.error(f"detailed error trace: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"error occurred during chat processing: {str(e)}")

@router.post("/reinit")
async def reinit_agent(request: ReinitRequest = None):
    """
    agent reinitialization API endpoint
    
    Args:
        request: reinitialization request data (optional)
        
    Returns:
        reinitialization result
    """
    global agent
    
    try:
        # determine model ID (provided in request or loaded from user settings)
        model_id = request.model_id if request and request.model_id else get_user_model()
        
        # load model configuration
        model_config = load_model_config(model_id)
        max_tokens = model_config.get("max_output_tokens", 4096)
        
        logger.info(f"agent reinitialization: model_id={model_id}, max_tokens={max_tokens}")
        
        # recreate agent
        agent = ReactAgent(model_id=model_id, max_tokens=max_tokens, mcp_json_path=MCP_CONFIG_PATH, reload_prompt=True)
        
        return ReinitResponse(
            success=True,
            model_id=model_id,
            max_tokens=max_tokens,
            message="agent reinitialized successfully"
        )
    
    except Exception as e:
        logger.error(f"agent reinitialization error: {e}")
        # retry with default model if error occurs
        try:
            model_id = "anthropic.claude-3-5-sonnet-20241022-v2:0"
            agent = ReactAgent(model_id=model_id, max_tokens=4096, mcp_json_path=MCP_CONFIG_PATH)
            
            return ReinitResponse(
                success=False,
                model_id=model_id,
                max_tokens=4096,
                message=f"error occurred after reinitialization, retry with default model: {str(e)}"
            )
        except Exception as fallback_error:
            logger.error(f"error occurred during reinitialization with default model: {fallback_error}")
            raise HTTPException(status_code=500, detail=f"agent reinitialization failed: {str(e)}")


# load model information when server starts
model_id = get_user_model()
model_config = load_model_config(model_id)
max_tokens = model_config.get("max_output_tokens", 4096)

# initialize agent when server starts
try:
    logger.info(f"agent initialization: model_id={model_id}, max_tokens={max_tokens}")
    # agent is initialized on the first request
    # MCPService is initialized in the FastAPI startup event
except Exception as e:
    logger.error(f"agent initialization preparation failed: {e}")
    logger.warning("agent will be initialized on the first request")