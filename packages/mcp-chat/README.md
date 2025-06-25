# MCP Chat

SolidStart 기반의 AI 에이전트 챗봇 애플리케이션입니다. AWS Bedrock과 MCP(Model Context Protocol) 도구를 통합하여 실시간 스트리밍 대화를 제공합니다.

## 빠른 시작

### 사전 준비 사항

- **Node.js 22+** 또는 **Bun** 설치
- **AWS 자격 증명** (Bedrock 서비스 액세스 권한)
- **MCP 서버** (선택사항)

### 개발 서버 실행

```bash
# 의존성 설치
bun install
# 또는 npm install

# 개발 서버 시작
bun dev
# 또는 npm run dev

# 브라우저에서 자동 열기
bun dev -- --open
# 또는 npm run dev -- --open
```

애플리케이션이 http://localhost:3000 에서 실행됩니다.

## 빌드 및 배포

### 로컬 빌드

```bash
# 프로덕션 빌드
bun run build
# 또는 npm run build

# 프로덕션 서버 실행
bun start
# 또는 npm start
```

### Docker 빌드

```bash
# Docker 이미지 빌드
docker build -t mcp-chat .

# 컨테이너 실행 (AWS credentials 필요)
docker run -e AWS_ACCESS_KEY_ID=your-key \
           -e AWS_SECRET_ACCESS_KEY=your-secret \
           -e AWS_REGION=us-east-1 \
           -p 3000:3000 \
           mcp-chat
```

### 사전 빌드된 이미지 사용

```bash
# ECR Public Gallery에서 이미지 가져오기
docker pull public.ecr.aws/z7w0k2i4/pace-korea/pace-mcp-client:latest

# 컨테이너 실행
docker run -e AWS_ACCESS_KEY_ID=your-key \
           -e AWS_SECRET_ACCESS_KEY=your-secret \
           -e AWS_REGION=us-east-1 \
           -p 3000:3000 \
           public.ecr.aws/z7w0k2i4/pace-korea/pace-mcp-client:latest
```

### AWS Profile 사용

```bash
# AWS CLI 프로필 마운트
docker run -v ~/.aws:/root/.aws:ro \
           -e AWS_PROFILE=your-profile \
           -e AWS_REGION=us-east-1 \
           -p 3000:3000 \
           public.ecr.aws/z7w0k2i4/pace-korea/pace-mcp-client:latest
```

## 개발 도구

### 코드 포맷팅 및 린팅

```bash
# Biome으로 코드 검사 및 수정
npx biome check --write .

# 린팅만 실행
npx biome lint .

# 포맷팅만 실행
npx biome format --write .
```

### 패키지 매니저

이 프로젝트는 다양한 패키지 매니저를 지원합니다:

```bash
# Bun (권장)
bun install
bun dev
bun run build

# npm
npm install
npm run dev
npm run build

# pnpm
pnpm install
pnpm dev
pnpm run build

# yarn
yarn install
yarn dev
yarn build
```

## 환경 변수

필요한 환경 변수를 설정하세요:

```bash
# .env.local 파일 생성
cp .env.example .env.local

# 주요 환경 변수
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_PROFILE=your-profile  # Access Key 대신 사용 가능
```

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `bun dev` | 개발 서버 시작 |
| `bun run build` | 프로덕션 빌드 |
| `bun start` | 프로덕션 서버 실행 |
| `npx biome check --write .` | 코드 린팅 및 포맷팅 |
| `docker build -t mcp-chat .` | Docker 이미지 빌드 |

## 문제 해결

### AWS 자격 증명 오류
```bash
# AWS CLI 설정 확인
aws configure list

# AWS 자격 증명 테스트
aws bedrock list-foundation-models
```

### 포트 충돌
```bash
# 다른 포트로 실행
PORT=3001 bun dev
```

### 의존성 오류
```bash
# node_modules 재설치
rm -rf node_modules
bun install
```

자세한 내용은 [메인 README](../../README.md)를 참조하세요.