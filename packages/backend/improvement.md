# Backend Code Analysis and Improvement Plan

## 🔍 전체 아키텍처 평가

### 강점
- FastAPI 기반의 잘 구조화된 REST API 아키텍처
- LangGraph를 활용한 ReAct 및 Plan-and-Execute 에이전트 패턴 구현
- AWS Bedrock과 MCP(Model Context Protocol) 통합
- 모듈화된 구조로 관심사 분리가 잘 되어 있음

### 주요 문제점
- 코드 복잡도가 높고 파일 크기가 매우 큼 (특히 agent 파일들이 700~1400줄)
- 일관성 없는 언어 사용 (영어/한국어 혼재)
- 전역 변수 사용으로 인한 상태 관리 문제
- 중복 코드가 많음

## 📁 파일별 상세 분석

### 1. main.py (✅ 양호)
- 깔끔한 FastAPI 애플리케이션 구조
- 적절한 lifespan 이벤트 처리
- CORS 설정 포함

### 2. ReactAgent (🚨 심각한 개선 필요)
**문제점:**
- **파일 크기**: 716줄로 단일 책임 원칙 위반
- **메서드 크기**: 일부 메서드가 100줄 이상
- **언어 혼재**: 주석과 변수명에 한국어/영어 혼재
- **중복 코드**: 메시지 정규화, 이력 관리 로직 중복
- **복잡한 스트리밍 로직**: 가독성이 떨어짐

```python
# 개선 전 (문제 있는 코드)
def _normalize_content(self, content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, list):
        return "".join(str(item) for item in content)
    return str(content)

# 이 메서드가 여러 클래스에서 중복됨
```

### 3. PlanAndExecuteAgent (🚨 심각한 개선 필요)
**문제점:**
- **파일 크기**: 1,397줄로 과도하게 큼
- **개발 중 상태**: 주석에 명시된 바와 같이 아직 개발 중
- **하드코딩된 로직**: 계산 처리가 하드코딩됨
- **복잡한 조건문**: 가독성이 매우 떨어짐

### 4. MCP Service (✅ 양호)
- 싱글톤 패턴 적절히 구현
- 비동기 처리 잘 구현됨
- 로깅이 적절함

### 5. Agent Router (⚠️ 개선 필요)
**문제점:**
- **전역 변수**: `agent = None` 전역 변수 사용
- **긴 메서드**: `chat()` 메서드가 400줄 이상
- **복잡한 파일 처리**: 스트리밍 로직이 매우 복잡

## 🚨 주요 개선 사항

### 1. 코드 구조 개선
```python
# 현재 문제
class ReactAgent:
    def __init__(self, ...): # 40줄
    async def astream(self, ...): # 200줄+
    async def ainvoke(self, ...): # 100줄+
    # ... 너무 많은 책임

# 개선 제안
class ReactAgent:
    def __init__(self, config: AgentConfig):
        self.message_handler = MessageHandler()
        self.conversation_manager = ConversationManager()
        self.streaming_handler = StreamingHandler()
    
class MessageHandler:
    def normalize_content(self, content: Any) -> str: ...
    def create_message_with_attachments(self, ...): ...

class ConversationManager:
    def prepare_conversation(self, ...): ...
    def add_to_history(self, ...): ...
```

### 2. 공통 유틸리티 추출
```python
# 중복 제거 예시
from src.common.message_utils import MessageNormalizer, ConversationHistory
from src.common.streaming_utils import StreamingResponseHandler

class BaseAgent:
    def __init__(self):
        self.message_normalizer = MessageNormalizer()
        self.conversation_history = ConversationHistory()
```

### 3. 타입 안전성 강화
```python
# 현재
def _normalize_content(self, content: Any) -> str:

# 개선
from typing import Union, List, Dict
def _normalize_content(self, content: Union[str, List[str], Dict[str, Any], None]) -> str:
```

### 4. 에러 처리 개선
```python
# 현재
except Exception as e:
    logger.error(f"error: {str(e)}")

# 개선
from src.common.exceptions import AgentError, MCPError
try:
    # logic
except MCPError as e:
    logger.error(f"MCP service error: {e}")
    raise HTTPException(status_code=503, detail="MCP service unavailable")
except AgentError as e:
    logger.error(f"Agent error: {e}")
    raise HTTPException(status_code=500, detail="Agent processing failed")
```

### 5. 설정 관리 개선
```python
# 현재: 하드코딩된 설정들
MAX_INDIVIDUAL_FILE_SIZE = 4.5 * 1024 * 1024

# 개선: 설정 클래스 사용
@dataclass
class AgentConfig:
    max_file_size: int = 4.5 * 1024 * 1024
    max_total_size: int = 25 * 1024 * 1024
    temperature: float = 0.3
    max_tokens: int = 4096
```

## 📊 성능 최적화 제안

### 1. 메모리 사용 최적화
- 대용량 파일 처리 시 스트리밍 방식 적용
- 대화 이력 크기 제한 및 압축

### 2. 응답 시간 개선
- MCP 도구 캐싱
- 프롬프트 템플릿 캐싱
- 연결 풀링 사용

### 3. 비동기 처리 개선
```python
# 현재: 순차 처리
for file in files:
    processed = await process_file(file)

# 개선: 병렬 처리
tasks = [process_file(file) for file in files]
processed_files = await asyncio.gather(*tasks)
```

## 🛡️ 보안 개선 사항

### 1. 입력 검증 강화
- 파일 타입 검증 개선
- 요청 크기 제한
- SQL 인젝션 방지

### 2. AWS 권한 최소화
- IAM 역할 기반 접근
- 리소스별 세분화된 권한

## 🏗️ 리팩토링 우선순위

### 1. High Priority
- Agent 클래스들을 작은 단위로 분할
- 공통 유틸리티 모듈 생성
- 전역 변수 제거

### 2. Medium Priority
- 타입 힌트 완전 적용
- 에러 처리 표준화
- 로깅 개선

### 3. Low Priority
- 성능 최적화
- 추가 테스트 커버리지
- 문서화 개선

## 📈 권장 다음 단계

### 1. 즉시 실행
- ReactAgent와 PlanAndExecuteAgent를 각각 3-4개 클래스로 분할
- 공통 메시지 처리 로직을 separate utility로 추출

### 2. 단기 목표 (1-2주)
- 전역 변수를 의존성 주입으로 변경
- 에러 처리 표준화

### 3. 중기 목표 (1-2개월)
- 전체 타입 안전성 개선
- 종합적인 테스트 스위트 추가

## 결론

전반적으로 기능은 잘 구현되어 있지만, 유지보수성과 확장성을 위해 코드 구조 개선이 시급합니다. 특히 Agent 클래스들의 크기 축소와 공통 유틸리티 추출이 가장 우선적으로 필요한 개선사항입니다.