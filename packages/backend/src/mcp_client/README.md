# MCP (Model-Controller-Processor)

MCP는 AI 모델과 상호작용하기 위한 도구 및 서비스를 제공하는 간단한 프레임워크입니다.

## 기본 사용법

### FastMCP 서버 생성

```python
from mcp.server.fastmcp import FastMCP

# MCP 서버 생성
mcp = FastMCP("프로젝트_이름")
```

### 도구 등록

```python
@mcp.tool()
def my_function(param1: str, param2: int) -> str:
    """도구 설명"""
    # 도구 구현
    return f"{param1}: {param2}"
```

### 서버 실행

```python
if __name__ == "__main__":
    mcp.run(host="localhost", port=5000)
```

## 예제

기본 예제는 `examples/basic_example.py`에서 확인할 수 있습니다:

```python
from mcp.server.fastmcp import FastMCP

# MCP 서버 생성
mcp = FastMCP("mcp_project")

# 도구 등록
@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

if __name__ == "__main__":
    mcp.run()
``` 