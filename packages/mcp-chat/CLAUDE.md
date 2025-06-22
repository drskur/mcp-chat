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
   - 메시지는 다양한 블록 타입으로 구성: TextBlock, CodeBlock, ToolUseBlock, ToolResultBlock, ErrorBlock
   - `src/types/chat.ts`에서 타입 정의
   - `src/components/chat/BlockContent.tsx`에서 블록별 렌더링

3. **State Management**
   - LangGraph StateAnnotation을 통한 대화 상태 관리
   - MemorySaver로 대화 히스토리 유지
   - Simple linear workflow: START → agent → END

4. **Component Structure**
   - Server actions (`src/actions/`) for server-side logic
   - Chat UI components in `src/components/chat/`
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

### Testing & Debugging

현재 명시적인 테스트 설정이 없으므로, 개발 중 다음 사항 확인:
- 브라우저 콘솔에서 에러 확인
- Network 탭에서 스트리밍 응답 확인
- AWS Bedrock 응답 상태 모니터링