<h2 align="center">
PACE MCP Client
</h2>
<div align="center">
  <img src="https://img.shields.io/badge/Nx-20.6.4-143055?logo=nx&logoColor=white"/>
  <img src="https://img.shields.io/badge/AWS-Bedrock-FF9900?logo=amazon&logoColor=white"/>
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?logo=python"/>
  <img src="https://img.shields.io/badge/LangGraph-0.4.3-8B5CF6?logo=github&logoColor=white"/>
  <img src="https://img.shields.io/badge/Next.js-15.3-black?logo=next.js"/>
  <img src="https://img.shields.io/badge/React-19-blue?logo=react"/>
</div>


<div align="center">
  <img src="docs/assets/main.png" alt="main page" width="800"/>
</div>


## 패키지 구성

- [Backend](./packages/backend/README.md) – FastAPI 기반 백엔드 서비스
- [Frontend](./packages/frontend/README.md) – Next.js 기반 사용자 인터페이스

---

## Overview
**PACE MCP Client**는 AWS Bedrock 기반 LLM 모델과 MCP(Managed Content Processing) 도구를 통합하여, 강력한 AI 에이전트 인터페이스를 제공합니다. 자연어 기반 챗봇을 통해 다양한 MCP 도구들을 활용할 수 있습니다.

### 목표
- **쉽고 직관적인 MCP 도구 활용**을 위한 자연어 인터페이스 제공
- **LangGraph 기반 AI 에이전트** 구현
- **확장 가능한 MCP 도구 통합 아키텍처** 구축

### 주요 기능
- **AI Agent 챗봇**: 
  자연어로 MCP 도구를 호출하고 결과를 확인할 수 있는 직관적인 인터페이스
- **MCP 도구 관리**: 
  다양한 MCP 도구를 쉽게 추가하고 관리할 수 있는 관리 패널
- **시스템 프롬프트 관리**: 
  AI 에이전트의 동작을 정의하는 시스템 프롬프트 커스터마이징
- **모델 선택**: 
  다양한 AWS Bedrock LLM 모델 중 선택하여 사용 가능

---

## 기술 스택

### 백엔드
- Python 3.13
- FastAPI
- AWS Bedrock
- LangGraph

### 프론트엔드
- Next.js 15.3
- React 19
- Tailwind CSS
- shadcn/ui 컴포넌트

---

## 프로젝트 설정 가이드

### 사전 준비 사항

1. **AWS Bedrock 액세스 권한**
   - AWS 계정에 Bedrock 서비스 액세스 권한이 필요합니다
2. **MCP 서비스 설정**
   - MCP 서비스 설정 및 접근 방식에 대한 구성이 필요합니다
   - `packages/backend/config/mcp_config.json` 파일에서 설정 가능합니다

### 설정 단계

1. **레포지토리 클론**

   ```bash
   git clone git@ssh.gitlab.aws.dev:kr-prototyping/pace-mcp-client.git
   cd pace-mcp-client
   ```

2. **백엔드 설정**

   ```bash
   # 의존성 설치
   uv venv
   uv sync
   source .venv/bin/activate
   
   cd packages/backend
   # .env 파일 설정
   cp .env.example .env
   # 필요한 환경 변수를 .env 파일에 입력
   ```

3. **프론트엔드 설정**

   ```bash
   cd packages/frontend
   npm install
   ```

4. **실행**

   ```bash
   # backend, frontend 동시에 수행
   npm run mcp-dev
   ```

5. **애플리케이션 접속**

   - 백엔드: http://localhost:8000
   - 프론트엔드: http://localhost:3000

## 주요 API 엔드포인트

- `/api/chat` - 챗봇 대화 API
- `/api/mcp-tools` - MCP 도구 관리 API
- `/api/prompts` - 시스템 프롬프트 관리 API
- `/api/models` - 모델 관리 API

## 참고 사항

⚠️ **MCP 도구 설정 방법**: MCP 도구를 사용하기 위해서는 먼저 `config/mcp_config.json` 파일에서 도구 서버 연결 정보를 설정해야 합니다. 각 도구 서버는 독립적으로 실행되며, 클라이언트는 이를 통합해 사용할 수 있습니다.

---

## License

This project is licensed under the [Amazon Software License](https://aws.amazon.com/asl/).
