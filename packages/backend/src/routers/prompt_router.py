"""
system prompt management API router
"""
import yaml
import logging
import os
from typing import Dict, Any, Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

# Current parent directory
BASE_DIR = Path(__file__).resolve().parent.parent

# logging configuration
logger = logging.getLogger(__name__)

# create router
router = APIRouter(prefix="/api/prompt", tags=["prompt"])

# request and response model
class PromptRequest(BaseModel):
    """prompt request model"""
    content: str

class PromptResponse(BaseModel):
    """prompt response model"""
    content: str

# prompt file path
PROMPT_FILE_PATH = os.getenv("PROMPT_FILE_PATH", os.path.join(BASE_DIR, "agent/react_agent/prompt/agent_profile.yaml"))

print(PROMPT_FILE_PATH)

def load_prompt() -> str:
    """
    load system prompt
    
    Returns:
        str: system prompt content
    """
    try:
        if os.path.exists(PROMPT_FILE_PATH):
            with open(PROMPT_FILE_PATH, "r") as f:
                return f.read()
        else:
            # default prompt
            default_prompt = """
# system prompt
system_prompt: |
  You are a powerful AI assistant. Answer user questions and perform tasks using the MCP tools if needed.
  
  Current time: {system_time}
  
  Follow these rules:
  1. Respond in Korean.
  2. Use tools if needed.
  3. Think step by step and reason logically.
"""
            # save prompt
            save_prompt(default_prompt)
            return default_prompt
    except Exception as e:
        logger.error(f"prompt load failed: {e}")
        return ""

def save_prompt(content: str) -> bool:
    """
    save system prompt
    
    Args:
        content: content to save
        
    Returns:
        bool: save success
    """
    try:
        # check and create directory
        os.makedirs(os.path.dirname(PROMPT_FILE_PATH), exist_ok=True)
        
        # YAML validation - parse and serialize again
        yaml_content = yaml.safe_load(content)
        
        # check required fields
        if "system_prompt" not in yaml_content:
            raise ValueError("'system_prompt' field is required")
        
        # save settings (original content)
        with open(PROMPT_FILE_PATH, "w") as f:
            f.write(content)
            
        return True
    except Exception as e:
        logger.error(f"prompt save failed: {e}")
        return False

@router.get("", response_model=PromptResponse)
async def get_prompt():
    """
    get system prompt
    
    Returns:
        PromptResponse: system prompt content
    """
    try:
        content = load_prompt()
        return PromptResponse(content=content)
    except Exception as e:
        logger.error(f"prompt get failed: {e}")
        raise HTTPException(status_code=500, detail=f"failed to get prompt: {str(e)}")

@router.post("")
async def update_prompt(request: PromptRequest):
    """
    update system prompt
    
    Args:
        request: content to update
        
    Returns:
        Dict: success message
    """
    try:
        # prompt validation and save
        if save_prompt(request.content):
            return {"message": "prompt saved successfully"}
        else:
            raise HTTPException(status_code=500, detail="failed to save prompt")
    except Exception as e:
        logger.error(f"prompt update failed: {e}")
        raise HTTPException(status_code=500, detail=f"failed to update prompt: {str(e)}") 