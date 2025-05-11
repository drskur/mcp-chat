from typing import List, Dict, Any
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field

class InputState(BaseModel):
    """에이전트 입력 상태 클래스"""
    messages: List[BaseMessage] = Field(default_factory=list)
    message_history: List[Dict] = Field(default_factory=list)
    
class State(BaseModel):
    """에이전트 상태 클래스"""
    messages: List[BaseMessage] = Field(default_factory=list)
    is_last_step: bool = False
    message_history: List[Dict] = Field(default_factory=list)
    
    def __init__(self, **data: Any):
        super().__init__(**data)