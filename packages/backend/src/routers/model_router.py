"""
Model information API router
"""
import os
import yaml
import base64
import logging
import json
from typing import Dict, Any, List, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Current parent directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# logging configuration
logger = logging.getLogger(__name__)

# create router
router = APIRouter(prefix="/api/models", tags=["models"])

# model and response data model
class ModelCapability(BaseModel):
    """model capability information"""
    text: bool = True
    image: bool = False
    code: bool = False

class ModelInfo(BaseModel):
    """model information"""
    id: str
    name: str
    provider: str
    provider_name: str
    icon_url: str
    provider_icon_url: str
    capabilities: ModelCapability
    max_output_tokens: int = 4096

class ProviderInfo(BaseModel):
    """provider information"""
    id: str
    name: str
    icon_url: str
    models: List[ModelInfo]

class ModelsResponse(BaseModel):
    """model list response"""
    providers: List[ProviderInfo]

class ModelSelectRequest(BaseModel):
    """model selection request"""
    model_id: str

class ModelSelectResponse(BaseModel):
    """model selection response"""
    success: bool
    model_id: str

class UserModelResponse(BaseModel):
    """user model response"""
    model_id: str

# model save path configuration
USER_SETTINGS_DIR = os.path.expanduser("~/.mcp-client")
USER_MODEL_FILE = os.path.join(USER_SETTINGS_DIR, "pace_mcp_client.json")
CONFIG_FILE = os.path.join(BASE_DIR, "config/models.yaml")
ICONS_DIR = os.path.join(BASE_DIR, "assets/icons/providers")

class ModelService:
    """model service"""
    
    def __init__(self):
        """initialize"""
        # path configuration
        self.config_path = CONFIG_FILE
        self.icons_path = ICONS_DIR
        
        # logging
        logger.debug(f"model configuration file path: {self.config_path}")
        logger.debug(f"icon directory path: {self.icons_path}")
        
        self.icons_cache = {}
        
        # create user settings directory
        os.makedirs(USER_SETTINGS_DIR, exist_ok=True)
    
    def _load_config(self) -> Dict[str, Any]:
        """load model configuration"""
        try:
            with open(self.config_path, "r") as f:
                config = yaml.safe_load(f)
                logger.debug(f"model configuration loaded: {len(config.get('providers', {}))} providers found")
                return config
        except Exception as e:
            logger.error(f"model configuration load failed: {e}")
            return {"providers": {}}
    
    def _load_icon(self, icon_name: str) -> str:
        """load icon"""
        if icon_name in self.icons_cache:
            return self.icons_cache[icon_name]
            
        icon_path = os.path.join(self.icons_path, icon_name)
        logger.debug(f"loading icon: {icon_path}")
        
        try:
            with open(icon_path, "rb") as f:
                icon_data = f.read()
                base64_icon = base64.b64encode(icon_data).decode("utf-8")
                data_url = f"data:image/svg+xml;base64,{base64_icon}"
                self.icons_cache[icon_name] = data_url
                logger.debug(f"icon loaded: {icon_name}")
                return data_url
        except Exception as e:
            logger.error(f"icon load failed: {icon_name}: {e}")
            return ""
    
    def get_available_models_by_provider(self) -> List[ProviderInfo]:
        """return grouped model list by provider"""
        models_config = self._load_config()
        providers = []
        
        for provider_id, provider_data in models_config.get('providers', {}).items():
            # load icon data
            icon_data = self._load_icon(provider_data.get('icon', ''))
            
            provider_models = []
            
            for model_id, model_data in provider_data.get('models', {}).items():
                # model capability configuration
                capabilities = ModelCapability(
                    text=True,
                    image='image' in model_data.get('capabilities', []),
                    code='code' in model_data.get('capabilities', [])
                )
                
                # create model information
                provider_models.append(ModelInfo(
                    id=model_data.get('id', ''),
                    name=model_data.get('name', ''),
                    provider=provider_id,
                    provider_name=provider_data.get('name', ''),
                    icon_url=icon_data,
                    provider_icon_url=icon_data,
                    capabilities=capabilities,
                    max_output_tokens=model_data.get('max_output_tokens', 4096)
                ))
                
                logger.debug(f"model added: {model_data.get('name', '')}")
            
            # add provider information
            providers.append(ProviderInfo(
                id=provider_id,
                name=provider_data.get('name', ''),
                icon_url=icon_data,
                models=provider_models
            ))
            
            logger.debug(f"provider added: {provider_data.get('name', '')} models: {len(provider_models)}")
        
        logger.debug(f"total {len(providers)} providers loaded")
        return providers
    
    def save_user_model(self, model_id: str) -> bool:
        """save user selected model"""
        try:
            with open(USER_MODEL_FILE, "w") as f:
                json.dump({"model_id": model_id}, f)
            logger.debug(f"user model saved: {model_id}")
            return True
        except Exception as e:
            logger.error(f"user model save failed: {e}")
            return False
    
    def get_user_model(self) -> str:
        """load user saved model"""
        try:
            if not os.path.exists(USER_MODEL_FILE):
                logger.debug("user model setting not found, return default value")
                return "anthropic.claude-3-5-sonnet-20241022-v2:0"  # default model change
            
            with open(USER_MODEL_FILE, "r") as f:
                data = json.load(f)
                model_id = data.get("model_id", "anthropic.claude-3-5-sonnet-20241022-v2:0")  # default value change
                logger.debug(f"user model loaded: {model_id}")
                return model_id
        except Exception as e:
            logger.error(f"user model load failed: {e}")
            return "anthropic.claude-3-5-sonnet-20241022-v2:0"  # error return default value

# create model service instance
model_service = ModelService()

@router.get("", response_model=ModelsResponse)
async def get_models():
    """
    return provider based available model list
    
    Returns:
        ModelsResponse: provider based available model list
    """
    try:
        providers = model_service.get_available_models_by_provider()
        return ModelsResponse(providers=providers)
    except Exception as e:
        logger.error(f"model information load failed: {e}")
        raise HTTPException(status_code=500, detail=f"failed to get model information: {str(e)}")

@router.post("/select", response_model=ModelSelectResponse)
async def select_model(request: ModelSelectRequest):
    """
    save user selected model
    
    Args:
        request: model selection request
        
    Returns:
        ModelSelectResponse: model selection save result
    """
    try:
        success = model_service.save_user_model(request.model_id)
        return ModelSelectResponse(success=success, model_id=request.model_id)
    except Exception as e:
        logger.error(f"model selection save failed: {e}")
        raise HTTPException(status_code=500, detail=f"failed to save model selection: {str(e)}")

@router.get("/user-model", response_model=UserModelResponse)
async def get_user_model():
    """
    load user saved model
    
    Returns:
        UserModelResponse: user model information
    """
    try:
        model_id = model_service.get_user_model()
        return UserModelResponse(model_id=model_id)
    except Exception as e:
        logger.error(f"user model information load failed: {e}")
        raise HTTPException(status_code=500, detail=f"failed to load user model information: {str(e)}") 