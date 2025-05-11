from typing import Annotated, List, Tuple, TypedDict, Union, Dict, Any
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage
import operator

# Plan 모델 정의
class Plan(BaseModel):
    """계획된 단계"""
    steps: Annotated[List[str], "순서대로 수행할 단계들"]
    
    def process_placeholders(self, replacements: Dict[str, Any]) -> 'Plan':
        """
        사용자 쿼리나 다른 변수들을 단계에 있는 플레이스홀더에 대체
        
        Args:
            replacements: 키와 값 쌍의 대체 사전 (예: {"messages": "실제 쿼리"})
            
        Returns:
            플레이스홀더가 대체된 새로운 Plan 객체
        """
        processed_steps = []
        for step in self.steps:
            processed_step = step
            for key, value in replacements.items():
                placeholder = "{" + key + "}"
                processed_step = processed_step.replace(placeholder, str(value))
            processed_steps.append(processed_step)
        return Plan(steps=processed_steps)

# Response 모델 정의
class Response(BaseModel):
    """최종 사용자 응답"""
    response: str = Field(description="사용자에게 제공할 최종 응답")

# Action 모델 정의
class Action(BaseModel):
    """수행할 작업"""
    action: Union[Response, Plan] = Field(
        description="수행할 작업. 사용자에게 응답하려면 Response를 사용하고,"
        "추가 도구를 사용하여 단계를 진행하려면 Plan을 사용하세요."
    )

# InputState 모델 정의
class InputState(TypedDict):
    """에이전트 상태"""
    messages: List[BaseMessage] = Field(default_factory=list)
    plan: Annotated[List[str], "현재 계획"]
    past_steps: Annotated[List[Tuple], operator.add]
    response: Annotated[str, "최종 응답"]