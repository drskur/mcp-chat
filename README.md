<h2 align="center">
PACE MCP Client
</h2>
<div align="center">
  <img src="https://img.shields.io/badge/SolidStart-1.1-2C3E50?logo=solid&logoColor=white"/>
  <img src="https://img.shields.io/badge/SolidJS-1.9-3B7DBA?logo=solid&logoColor=white"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript"/>
  <img src="https://img.shields.io/badge/AWS-Bedrock-FF9900?logo=amazon&logoColor=white"/>
  <img src="https://img.shields.io/badge/MCP-Protocol-8B5CF6?logo=github&logoColor=white"/>
  <img src="https://img.shields.io/badge/Bun-1.0-000000?logo=bun&logoColor=white"/>
</div>


<div align="center">
  <img src="docs/assets/main.png" alt="main page" width="800"/>
</div>


## Overview
**PACE MCP Client**는 AWS Bedrock의 LLM 모델과 MCP(Model Context Protocol) 도구를 통합한 AI 에이전트 플랫폼입니다. SolidStart 기반으로 구현된 실시간 스트리밍 챗 애플리케이션으로, LangGraph를 통해 워크플로우를 관리합니다.

### 주요 특징
- **SolidStart 기반**: 고성능 반응형 웹 프레임워크로 빠른 응답성 제공
- **MCP 도구 통합**: 다양한 MCP 도구를 자연어로 활용
- **Tool Approval System**: 도구 실행 전 사용자 승인 및 인자 편집 기능
- **AWS Bedrock 통합**: Claude 3.5 Haiku 등 다양한 LLM 모델 지원
- **실시간 스트리밍**: ReadableStream을 통한 실시간 응답 스트리밍

### 주요 기능
- **AI 에이전트 챗봇**: 자연어로 MCP 도구를 호출하고 결과를 확인하는 대화형 인터페이스
- **Tool Approval Dialog**: 도구 실행 전 인자 확인 및 편집 기능
- **MCP 도구 관리**: 도구 추가/삭제, 상태 모니터링, 실시간 동기화
- **시스템 프롬프트 관리**: AI 에이전트 동작 커스터마이징을 위한 프롬프트 편집기
- **모델 선택**: AWS Bedrock의 다양한 LLM 모델 선택 및 전환
- **파일 업로드**: 챗봇 대화에 파일 첨부 기능
- **사용자 설정**: 개인화된 설정 저장 및 관리

---

## 기술 스택

- **Framework**: SolidStart 1.1 + SolidJS 1.9
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + @kobalte/core
- **AI Integration**: 
  - AWS Bedrock SDK
  - LangGraph (워크플로우 관리)
  - @langchain/mcp-adapters (MCP 프로토콜)
- **Build Tool**: Vinxi
- **Storage**: Conf (로컬 설정 관리)

---

## 프로젝트 구조

```
pace-mcp-client/
├── packages/
│   └── mcp-chat/              # 메인 애플리케이션
│       ├── src/
│       │   ├── actions/       # Server Actions
│       │   │   ├── chat.ts    # 채팅 스트리밍 로직
│       │   │   ├── config.ts  # 설정 관리
│       │   │   ├── mcp.ts     # MCP 도구 관리
│       │   │   └── index.ts   # 액션 익스포트
│       │   ├── components/    # React 컴포넌트
│       │   │   ├── chat/      # 채팅 인터페이스
│       │   │   │   ├── MessageList.tsx
│       │   │   │   ├── MessageInput.tsx
│       │   │   │   ├── BlockContent.tsx
│       │   │   │   └── ToolApprovalDialog.tsx
│       │   │   ├── layout/    # 레이아웃 컴포넌트
│       │   │   ├── settings/  # 설정 관리
│       │   │   └── ui/        # @kobalte/core 기반 UI
│       │   ├── lib/           # 핵심 비즈니스 로직
│       │   │   ├── graph/     # LangGraph 워크플로우
│       │   │   │   ├── workflow.ts
│       │   │   │   └── human-review.ts
│       │   │   └── mcp/       # MCP 관리자
│       │   ├── routes/        # 페이지 라우트
│       │   └── types/         # TypeScript 타입 정의
│       ├── Dockerfile         # Docker 이미지 빌드
│       ├── package.json       # 프로젝트 설정
│       └── CHANGELOG.md       # 변경 이력
├── k8s/                       # Kubernetes 매니페스트
│   └── mcp-host/
├── docs/                      # 문서 및 리소스
└── Makefile                   # 빌드 및 배포 자동화
```

---

## 빠른 시작

### 사전 준비 사항

1. **Node.js 22+** 또는 **Bun** 설치
2. **AWS 자격 증명**
   - AWS CLI 구성 또는 환경 변수 설정
   - Bedrock 서비스 액세스 권한 필요
3. **MCP 서버** (선택사항)
   - MCP 도구를 사용하려면 MCP 서버 실행 필요

### 설치 및 실행

1. **레포지토리 클론**
   ```bash
   git clone <repository-url>
   cd pace-mcp-client/packages/mcp-chat
   ```

2. **의존성 설치**
   ```bash
   # Bun 사용 (권장)
   bun install
   
   # 또는 npm 사용
   npm install
   ```

3. **환경 설정**
   ```bash
   # 환경 변수 설정 (필요시)
   cp .env.example .env.local
   ```

4. **개발 서버 실행**
   ```bash
   # Bun 사용
   bun dev
   
   # 또는 npm 사용
   npm run dev
   ```

5. **애플리케이션 접속**
   - http://localhost:3000

### 프로덕션 빌드

```bash
# 빌드
bun run build
# 또는 npm run build

# 프로덕션 실행
bun start
# 또는 npm start
```

---

## 배포

### 사전 빌드된 Docker 이미지 사용

AWS ECR Public Gallery에 사전 빌드된 이미지가 제공됩니다:

```bash
# 최신 이미지 pull
docker pull public.ecr.aws/z7w0k2i4/pace-korea/pace-mcp-client:latest

# 컨테이너 실행 (AWS credentials 설정 필요)
docker run -e AWS_ACCESS_KEY_ID=your-access-key \
           -e AWS_SECRET_ACCESS_KEY=your-secret-key \
           -e AWS_REGION=us-east-1 \
           -p 3000:3000 \
           public.ecr.aws/z7w0k2i4/pace-korea/pace-mcp-client:latest
```

### AWS Credentials 설정

Docker 컨테이너에서 AWS Bedrock을 사용하려면 AWS credentials 설정이 필요합니다. 다음 중 하나의 방법을 선택하세요:

#### 1. AWS Access Key 사용
```bash
# Docker 실행 시
docker run -e AWS_ACCESS_KEY_ID=your-access-key \
           -e AWS_SECRET_ACCESS_KEY=your-secret-key \
           -e AWS_REGION=us-east-1 \
           -p 3000:3000 \
           public.ecr.aws/z7w0k2i4/pace-korea/pace-mcp-client:latest

# Docker Compose 사용 시
services:
  app:
    environment:
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
```

#### 2. AWS Profile 사용 (로컬 개발 권장)
```bash
# AWS CLI 프로필이 설정된 경우
docker run -v ~/.aws:/root/.aws:ro \
           -e AWS_PROFILE=your-profile \
           -e AWS_REGION=us-east-1 \
           -p 3000:3000 \
           public.ecr.aws/z7w0k2i4/pace-korea/pace-mcp-client:latest

# Docker Compose 사용 시
services:
  app:
    volumes:
      - ~/.aws:/root/.aws:ro
    environment:
      - AWS_PROFILE=${AWS_PROFILE}
      - AWS_REGION=${AWS_REGION}
```


## Limitations

### 설정 저장 방식의 제한사항

현재 PACE MCP Client는 서버 측 설정을 로컬 파일 시스템에 저장하는 방식을 사용하고 있습니다. 이로 인해 다음과 같은 제한사항이 있습니다:

1. **로드 밸런싱 미지원**
   - 설정이 각 서버의 로컬 파일에 저장되므로, 여러 대의 서버를 통한 로드 밸런싱을 구성할 수 없습니다
   - 각 서버 인스턴스가 독립적인 설정 파일을 가지게 되어 일관성 문제가 발생합니다

2. **다중 세션 문제**
   - 같은 사용자가 여러 브라우저나 디바이스에서 동시에 접속할 경우, 설정 변경사항이 예상대로 동작하지 않을 수 있습니다
   - 한 세션에서 변경한 설정이 다른 세션에 즉시 반영되지 않을 수 있습니다

3. **확장성 제한**
   - 단일 서버 환경에서만 정상적으로 동작합니다
   - 고가용성(HA) 구성이나 수평적 확장이 어렵습니다

---

## 개발 가이드

### 코드 스타일
- **Biome** 사용 (ESLint/Prettier 대체)
- 2 space 들여쓰기
- Double quotes 사용

---

## 라이선스

This project is licensed under the [Amazon Software License](https://aws.amazon.com/asl/).