# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Project Management MVP: a single-page Kanban board app with AI chat sidebar. Runs locally in Docker. FastAPI backend serves a statically exported Next.js frontend.

## Commands

### Frontend (`frontend/`)

```bash
npm run dev          # Development server (Next.js with Turbopack)
npm run build        # Static export to frontend/out/
npm run lint         # ESLint
npm run test         # Vitest unit/component tests (single run)
npm run test:unit:watch  # Vitest in watch mode
npm run test:e2e     # Playwright end-to-end tests
npm run test:all     # Unit + E2E
```

Run a single test file:
```bash
npx vitest run src/lib/kanban.test.ts
npx playwright test tests/kanban.spec.ts
```

### Backend (`backend/`)

```bash
pytest               # Run all backend tests
pytest tests/test_main.py::test_hello  # Run a single test
uvicorn app.main:app --reload  # Dev server on port 8000
```

### Docker (full stack)

```bash
./scripts/start-mac.sh   # Build and start Docker container
./scripts/stop-mac.sh    # Stop container
```

The container builds the frontend first (Node 22), then runs the backend (Python 3.12) which mounts the static export.

## Architecture

### Frontend

- **Next.js 16** with `output: "export"` — purely static, no SSR
- All components are `"use client"`
- **Single page**: `src/app/page.tsx` renders `AuthShell`, which wraps `KanbanBoard`
- **Auth**: localStorage flag (`pm-authenticated`), hardcoded credentials (`user`/`password`)
- **Board state**: React `useState` in `KanbanBoard.tsx`; changes debounce 250ms before `PUT /api/board`
- **Drag & drop**: `@dnd-kit` with `PointerSensor`
- **Board data shape** (must be preserved):
  ```typescript
  BoardData = { columns: Column[], cards: Record<string, Card> }
  // Each Column has ordered cardIds; cards are stored separately
  ```
- **AI sidebar**: maintained in `AuthShell.tsx`, sends chat history + board state to `POST /api/ai/board`

### Backend

- **FastAPI** app in `backend/app/main.py`
- **SQLite**: auto-created on startup; `board_store.py` handles all DB access; board stored as denormalized JSON in `board_json` column
- **AI**: `FoundryClient` in `ai.py` wraps async httpx calls to Azure Foundry (OpenAI-compatible). Config loaded from `.env` at project root: `AI_FOUNDRY_ENDPOINT`, `AI_FOUNDRY_KEY`, `AI_FOUNDRY_MODEL`
- **Static serving**: FastAPI mounts `frontend/out/` at `/`; falls back to placeholder HTML when absent
- **Key routes**: `GET /api/board`, `PUT /api/board`, `POST /api/ai/board`, `POST /api/ai/connectivity`
- **Pydantic schemas** in `schemas.py` validate all API inputs/outputs

### Color scheme (CSS variables in `globals.css`)

| Variable | Value | Usage |
|---|---|---|
| `--accent-yellow` | `#ecad0a` | Accent lines, highlights |
| `--primary-blue` | `#209dd7` | Links, key sections |
| `--secondary-purple` | `#753991` | Submit buttons, important actions |
| `--navy-dark` | `#032147` | Main headings |
| `--gray-text` | `#888888` | Supporting text, labels |

Fonts: `Space Grotesk` for display, `Manrope` for body.

## Coding Standards

- **No over-engineering**: keep it simple, no defensive programming, no extra features
- **No emojis** anywhere
- When hitting issues, identify root cause before fixing — prove with evidence
- Keep README minimal
- Backend uses `uv` for Python package management (inside Docker only)
- Frontend path alias: `@/*` maps to `src/*`

## Key Files

- `docs/PLAN.md` — implementation plan (Parts 1–7 complete, consult before new work)
- `backend/app/board_store.py` — all SQLite logic including seeding
- `backend/app/ai.py` — FoundryClient and prompt building
- `frontend/src/lib/kanban.ts` — board types, `moveCard`, `createId`
- `frontend/src/components/KanbanBoard.tsx` — board state + drag/drop orchestration
- `frontend/src/components/AuthShell.tsx` — login gate + AI sidebar
