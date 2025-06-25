# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Chat은 SolidStart 기반의 실시간 AI 챗 애플리케이션으로, AWS Bedrock과 LangGraph를 사용하여 MCP(Model Context Protocol) 지원 챗봇을 구현합니다.

## Common Development Commands

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 코드 포맷팅 및 린팅 (Biome 사용)
npx biome check --write .
npx biome lint .
npx biome format --write .

# Bun 사용 (Dockerfile에서 활용)
bun install --frozen-lockfile
bun run build
bun start
```

## Architecture Overview

### Core Stack
- **Framework**: SolidJS + SolidStart (Vinxi 기반)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS v4 + @kobalte/core
- **AI Integration**: 
  - AWS Bedrock (Claude 3.5 Haiku)
  - LangGraph for workflow management
  - @langchain/mcp-adapters for MCP protocol

### Key Architectural Patterns

1. **Streaming Architecture**
   - `src/actions/chat.ts`에서 ReadableStream 기반 실시간 스트리밍
   - AbortController를 통한 스트림 취소 관리
   - activeStreams Map으로 진행 중인 스트림 추적

2. **Message Block System**
   - 메시지는 다양한 블록 타입으로 구성: TextBlock, CodeBlock, ToolUseBlock, ToolResultBlock, ErrorBlock, InterruptBlock
   - `src/types/chat.ts`에서 타입 정의
   - `src/components/chat/BlockContent.tsx`에서 블록별 렌더링
   - InterruptBlock을 통한 MCP 도구 승인 요청 처리

3. **State Management**
   - LangGraph StateAnnotation을 통한 대화 상태 관리
   - MemorySaver로 대화 히스토리 유지
   - Human-in-the-loop workflow: START → agent → shouldHumanReview → humanReview → tools → agent
   - 도구 승인을 위한 워크플로우 중단 및 재개 기능

4. **MCP Tool Approval System** 
   - `ToolApprovalDialog.tsx`를 통한 외부 도구 사용 승인 시스템
   - 도구 인수 편집 가능한 JSON 에디터 포함
   - "거절", "한 번만 허용" 옵션 제공
   - `human-review.ts`에서 LangGraph interrupt 기능 활용
   - 보안성과 사용자 제어권 보장

5. **Component Structure**
   - Server actions (`src/actions/`) for server-side logic
   - Chat UI components in `src/components/chat/`
   - Settings components in `src/components/settings/`
   - Shared UI components using @kobalte/core
   - Route-based code splitting with SolidStart

### Development Guidelines

1. **TypeScript Strict Mode**: 항상 strict mode 유지
2. **Path Aliases**: `@/` prefix 사용 (tsconfig.json에 정의됨)
3. **Code Style**: 
   - Biome 설정 준수 (2 space indent, double quotes)
   - ?? 연산자 사용 (|| 대신)
4. **Component Patterns**:
   - SolidJS 반응성 패턴 준수
   - createSignal, createEffect 등 SolidJS primitives 사용
   - JSX에서 조건부 렌더링 시 Show/Switch 컴포넌트 활용

### File Structure Conventions

- `/src/actions/`: Server-side actions (use "use server" directive)
- `/src/components/`: Reusable UI components
  - `/src/components/chat/`: Chat-specific components
  - `/src/components/settings/`: Settings page components
- `/src/routes/`: Page components and routing
- `/src/lib/`: Core business logic and utilities
- `/src/types/`: TypeScript type definitions

### Important Implementation Details

1. **Chat Streaming**: 
   - 각 스트림은 고유한 streamId로 관리
   - 사용자 중단과 일반 에러를 구분하여 처리
   - IME(한글 입력) 지원을 위한 특별 처리

2. **Auto-scroll Behavior**:
   - 새 메시지나 스트리밍 텍스트 추가 시 자동 스크롤
   - MessageList 컴포넌트에서 MutationObserver 사용

3. **Error Handling**:
   - User abort는 별도로 감지하여 UI에 표시
   - ErrorBlock 타입으로 사용자 친화적 에러 표시

4. **Settings Management**:
   - 설정 페이지는 3개 카테고리로 구성: 일반, MCP 서버, 모델 설정
   - `ConfigManager` 클래스를 통한 중앙집중식 설정 관리
   - Zod 스키마로 설정 유효성 검증
   - 실시간 MCP 서버 상태 모니터링
   - JSON 에디터를 통한 직접 설정 편집 기능

5. **MCP Server Management**:
   - `McpServerCard.tsx`로 서버별 정보 카드 표시
   - 서버 온라인/오프라인 상태 실시간 확인
   - 각 서버의 사용 가능한 도구 목록 표시
   - `McpServerJsonEditor.tsx`로 설정 직접 편집 지원

### Testing & Debugging

현재 명시적인 테스트 설정이 없으므로, 개발 중 다음 사항 확인:
- 브라우저 콘솔에서 에러 확인
- Network 탭에서 스트리밍 응답 확인
- AWS Bedrock 응답 상태 모니터링
- MCP 서버 연결 상태 확인

### Deployment

Docker를 사용한 프로덕션 배포:
- Node.js 23 slim 기반 이미지
- Bun을 빌드 도구로 사용
- Python3과 uv 설치 (MCP 서버 지원용)
- 포트 3000에서 서비스 제공