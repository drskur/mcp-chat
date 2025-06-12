# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PACE MCP Client is a full-stack application that integrates AWS Bedrock LLM models with MCP (Model Context Protocol) tools through a natural language AI agent interface. It consists of a FastAPI Python backend and a Next.js React frontend.

## Essential Commands

### Development
```bash
# Run both backend and frontend together (recommended)
npm run mcp-dev

# Run backend only
cd packages/backend
python main.py

# Run frontend only  
cd packages/frontend
npm run dev
```

### Build and Deployment
```bash
# Build and push both API and UI to ECR
make all

# Build API only
make api

# Build UI only
make ui

# Show current version
make show-version

# Set specific version
make set-version NEW_VERSION=v0.0.9
```

### Testing
```bash
# Run backend tests
cd packages/backend
python tests/test.py
```

## Architecture & Key Patterns

### Backend (packages/backend)
- **FastAPI-based REST API** with async endpoints
- **LangGraph agents** for AI orchestration (ReAct pattern implemented, Plan-and-Execute in development)
- **MCP client integration** for tool connectivity
- **AWS Bedrock** for LLM access (supports Amazon Nova and Anthropic Claude models)
- Uses **uv** package manager (not pip) for Python dependencies

### Frontend (packages/frontend)
- **Next.js 15.3** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** and **shadcn/ui** for styling
- Chat interface with streaming support
- **Component Structure**: Organized into logical feature-based architecture
  ```
  src/components/
  ├── common/           # Shared components across features
  │   ├── dialog/       # AlertDialogManager
  │   └── layout/       # StatusBar, sidebar components
  ├── features/         # Feature-specific components
  │   ├── chat/         # Chat interface, messaging, file attachments
  │   ├── mcp/          # MCP tool management
  │   ├── settings/     # Model selection, system prompts, user settings
  │   └── onboarding/   # Welcome screen
  └── ui/               # shadcn/ui base components
  ```

### Key API Endpoints
- `/api/chat` - AI agent chat interface
- `/api/mcp-tools` - MCP tools management  
- `/api/prompts` - System prompt management
- `/api/models` - Model selection and management

### Important Configuration Files
- `packages/backend/config/mcp_config.json` - MCP server connections
- `packages/backend/config/models.yaml` - AWS Bedrock model configurations
- `packages/backend/.env` - Environment variables (create from .env.example)

### Deployment
- Uses Docker containers deployed to Kubernetes
- ECR repositories for images
- Makefile automates build and push to AWS ECR using `detective` AWS profile
- K8s manifests in `k8s/mcp-host/` directory

## Development Notes

1. **Package Management**: Backend uses `uv`, frontend uses `npm`
2. **Python Version**: Requires Python 3.13+
3. **AWS Credentials**: Must be configured before running
4. **MCP Tools**: Add new tools in `packages/backend/src/mcp_client/server/basic_server.py`
5. **Model Updates**: Modify `packages/backend/config/models.yaml` to add new Bedrock models
6. **Version Updates**: Use `make set-version` to update version across all deployment files

## Recent Changes (ts branch)

### Frontend Refactoring
- **Server Actions Introduction**: Started implementing Next.js server actions to replace backend API calls
  - Added `/app/actions/models/user-model.ts` for model management via server actions
  - Utilizing settings.ts library for persistent configuration storage
- **Component Architecture Overhaul**: Complete reorganization of components folder structure for better maintainability
  - Moved components into `features/` (chat, mcp, settings, onboarding) and `common/` (dialog, layout) directories
  - Relocated dialog components to appropriate feature folders (settings, mcp)
  - Consolidated layout components under `common/layout/`
  - Simplified nested folder structures (removed unnecessary `welcome/` and `file/` folders)
  - Updated all import paths to reflect new logical grouping
- **Component Modularization**: Split large page.tsx into smaller, maintainable components
- **Utility Migration**: Moved init-upload-dir utility from API to utils directory for better organization

### Project Goal
The current objective is to re-implement all backend APIs (`/api/*` endpoints) as Next.js server actions, eliminating the need for the Python FastAPI backend and creating a pure Next.js application with MCP integration.