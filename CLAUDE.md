# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
```bash
# Frontend development (with Turbopack)
cd packages/frontend
npm run dev

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

### Deployment
```bash
# Show current version
make show-version

# Set new version
make set-version NEW_VERSION=v1.0.0

# Build and push UI to ECR
make ui

# Build and push both API and UI
make all
```

## Architecture Overview

### Monorepo Structure
This is an Nx-based monorepo with the main application in `packages/frontend`. The project uses Next.js 15.3 with App Router and Server Actions for full-stack functionality without a separate backend.

### Key Architectural Patterns

1. **Server Actions Pattern**
   - All backend logic is implemented as Server Actions in `/app/actions/`
   - No separate API endpoints needed except for legacy file uploads
   - Real-time streaming via ReadableStream for AI responses

2. **MCP Integration**
   - MCP tools are managed through `MCPClientManager` singleton
   - Configuration loaded from user-specific settings
   - Tools are dynamically discovered and exposed to LangGraph

3. **AI Agent Workflow**
   - Uses LangGraph for agent orchestration (`workflow.ts`)
   - State management through `StateAnnotation`
   - AWS Bedrock integration for LLM models

4. **State Management**
   - React Context for UI state
   - Server-side settings persisted to filesystem
   - Chat sessions managed through hooks with streaming support

5. **File Organization**
   - `/app/actions/` - Server-side business logic
   - `/components/features/` - Feature-specific UI components
   - `/hooks/` - Custom React hooks organized by domain
   - `/mcp/` - MCP client and configuration management
   - `/lib/` - Utilities and shared configuration

### Important Technical Details

- TypeScript is configured with path alias `@/` pointing to `src/`
- Tailwind CSS with shadcn/ui for styling
- File uploads limited to 10MB (configured in next.config.ts)
- AWS credentials required for Bedrock access
- MCP servers run as separate processes and communicate via the MCP protocol