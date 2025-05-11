<h2 align="center">
PACE MCP Client - Backend
</h2>

<div align="center">
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?logo=python"/>
  <img src="https://img.shields.io/badge/FastAPI-0.115.12-009688?logo=fastapi"/>
  <img src="https://img.shields.io/badge/LangGraph-0.4.3-8B5CF6?logo=github&logoColor=white"/>
  <img src="https://img.shields.io/badge/AWS-Bedrock-FF9900?logo=amazon&logoColor=white"/>
</div>


## 개요

PACE MCP Client 백엔드는 AWS Bedrock을 기반으로 한 AI 에이전트와 MCP(Managed Content Processing) 도구를 통합하는 FastAPI 기반 서버입니다.

현재 구현된 에이전트는 ReAct 패턴을 기반으로 작동하며, Plan and Execute 패턴도 개발 중입니다.

## 주요 기능

- **AI 에이전트**: LangGraph 기반 ReAct 패턴 구현
- **MCP 도구 통합**: 다양한 MCP 도구 서버 연결 및 사용
- **시스템 프롬프트 관리**: 에이전트 동작 정의 커스터마이징
- **모델 관리**: 다양한 AWS Bedrock 모델 사용 지원

## 시작하기

### 필수 요구사항

- Python 3.12 이상
- AWS Bedrock 액세스 권한
- AWS 인증 정보 설정

### 설치

1. 의존성 설치:

```bash
# 프로젝트 Root 폴더에서
uv venv
uv sync
source .venv/bin/activate
```

2. 환경 변수 설정:

```bash
cp .env.example .env
# .env 파일을 열어 필요한 설정 입력
```

3. 서버 실행:

```bash
python main.py
```

서버는 기본적으로 `http://localhost:8000`에서 실행됩니다. 포트가 이미 사용 중인 경우 다른 포트를 지정하세요.

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 프로젝트 구조

```
backend/
├── config/               # 설정 파일
│   ├── mcp_config.json   # MCP 서버 설정
│   └── models.yaml       # Bedrock 모델 설정
├── src/                  # 소스 코드
│   ├── agent/            # AI 에이전트 코드
│   │   ├── react_agent/  # ReAct 패턴 에이전트
│   │   └── plan_and_execute_agent/ # 개발 중인 Plan and Execute 에이전트
│   ├── mcp_client/       # MCP 클라이언트 코드
│   │   └── server/       # MCP 서버 구현
│   └── routers/          # API 라우터
└── tests/                # 테스트 코드
    └── test.py           # 테스트 스크립트
```

## MCP 도구 추가하기

간단하게 새로운 MCP 도구를 추가하려면 `src/mcp_client/server/basic_server.py` 파일에 추가하세요.

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("basic-mcp-server")

@mcp.tool()
def my_custom_tool(param1: str, param2: int) -> str:
    """사용자 정의 도구 설명"""
    # 도구 구현
    return f"결과: {param1}, {param2}"

if __name__ == "__main__":
    mcp.run()
```

## MCP 서버 설정

MCP 서버 설정은 `config/mcp_config.json` 파일에서 관리됩니다.

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Desktop/MCP"
      ]
    }
  }
}
```

## 모델 추가하기

새로운 Bedrock 모델을 추가하려면 `config/models.yaml` 파일을 수정하세요.

```yaml
models:
  - name: "Claude 3.7 Sonnet"
    id: "anthropic.claude-3-7-sonnet-20250219-v1:0"
    provider: "anthropic"
    max_tokens: 8096
```

## 테스트

백엔드 테스트를 실행하려면

```bash
python tests/test.py
```

## 참고 사항

- ReAct 패턴은 `src/agent/react_agent/`에 구현되어 있습니다.
- 향후 Plan and Execute 패턴도 추가될 예정입니다.
- 새로운 MCP 도구를 개발할 때는 도구 설명과 매개변수 유형을 명확히 정의하세요.
