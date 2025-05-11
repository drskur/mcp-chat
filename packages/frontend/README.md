<h2 align="center">
PACE MCP Client - Frontend
</h2>

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.3-black?logo=next.js"/>
  <img src="https://img.shields.io/badge/React-19-blue?logo=react"/>
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white"/>
  <img src="https://img.shields.io/badge/shadcn/ui-latest-000000?logo=shadcnui&logoColor=white"/>
</div>

## 개요

PACE MCP Client 프론트엔드는 Next.js와 React를 기반으로 하는 MCP 도구 및 AI 에이전트 인터페이스입니다.

> ⚠️ **참고**: 이 프론트엔드는 현재 프로토타입 단계이며 향후 리팩토링이 필요합니다.

## 주요 기능

- **챗봇 인터페이스**: AI 에이전트와 상호작용을 위한 인터페이스
- **MCP 도구 관리자**: MCP 도구 관리 및 설정
- **시스템 프롬프트 에디터**: 에이전트 프롬프트 커스터마이징
- **모델 선택기**: 다양한 Bedrock 모델 선택

## 시작하기

### 필수 요구사항

- Node.js 18.x 이상
- 백엔드 서버 실행 중

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드는 `http://localhost:3000`에서 접근할 수 있습니다.

## 주요 컴포넌트

- **ChatInterface**: 채팅 인터페이스 구현
- **MCPToolManager**: MCP 도구 관리 인터페이스
- **SystemPromptEditor**: 시스템 프롬프트 편집 컴포넌트 
- **ModelSelector**: 모델 선택 컴포넌트

## 향후 개선사항

이 프론트엔드는 빠른 프로토타이핑을 위해 개발되었으며, 다음과 같은 개선이 필요합니다.

1. 코드 구조 리팩토링
2. 상태 관리 개선 (전역 상태 관리 패턴 적용)
3. 에러 처리 및 로딩 상태 개선
