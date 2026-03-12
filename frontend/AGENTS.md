# Frontend Guide

This document describes the current state of the standalone frontend demo in `frontend/`. It exists to help future work preserve behavior while the app is integrated into the backend and Docker flow.

## Purpose

The frontend is a Next.js app that renders a single-page Kanban board demo. It is currently frontend-only and stores all board state in client memory.

Current user-visible behavior:
- Renders a five-column Kanban board at `/`
- Allows renaming columns inline
- Allows adding cards to a column
- Allows deleting cards
- Allows moving cards with drag and drop
- Uses a polished branded layout matching the project color palette

What it does not do yet:
- No login flow
- No backend API calls
- No persistence across refresh
- No AI sidebar

## App structure

Entry points:
- `src/app/page.tsx`: renders the Kanban board page
- `src/app/layout.tsx`: defines metadata, global fonts, and root layout
- `src/app/globals.css`: defines theme variables and global styles

Main components:
- `src/components/KanbanBoard.tsx`: top-level client component with board state and drag/drop orchestration
- `src/components/KanbanColumn.tsx`: column UI, rename input, card list, add-card form toggle
- `src/components/KanbanCard.tsx`: individual card display and delete action
- `src/components/KanbanCardPreview.tsx`: drag overlay preview
- `src/components/NewCardForm.tsx`: inline form for creating a card

Board logic:
- `src/lib/kanban.ts`: board types, initial demo data, card movement logic, and id generation

## State model

The current board state lives entirely inside `KanbanBoard` React state.

Data shape:
- `BoardData`
- `columns: Column[]`
- `cards: Record<string, Card>`

Important detail:
- Each column stores ordered `cardIds`
- Card entities are stored separately in `cards`
- Drag/drop updates only the `columns` ordering, not the card objects themselves

This shape should be preserved unless there is a strong reason to change it, because the tests and UI already assume it.

## Interaction model

`KanbanBoard.tsx` is the current behavior anchor.

Responsibilities:
- Initializes state from `initialData`
- Configures `@dnd-kit/core`
- Tracks the active dragged card for the drag overlay
- Handles column rename, card add, card delete, and drag end updates

Current implementation notes:
- It is a client component (`"use client"`)
- Drag/drop uses `PointerSensor` with a small activation distance
- Reordering and cross-column moves are delegated to `moveCard`
- New cards get generated ids via `createId`

## Styling

The current frontend already expresses the intended design direction.

Visual rules already present:
- Uses the agreed palette via CSS variables in `src/app/globals.css`
- Uses `Space Grotesk` for display text and `Manrope` for body text
- Uses soft surfaces, subtle borders, and radial background accents
- Keeps the layout focused on one board with minimal chrome

Future UI work should preserve this look unless the user asks for a redesign.

## Tests

Unit and component tests:
- `src/lib/kanban.test.ts`: verifies core card-move logic
- `src/components/KanbanBoard.test.tsx`: verifies five columns render, columns can be renamed, and cards can be added/removed

E2E tests:
- `tests/kanban.spec.ts`: verifies page load, add-card flow, and drag/drop between columns

Testing tools:
- Vitest for unit/component tests
- Testing Library for component interaction
- Playwright for end-to-end coverage

## Constraints for future changes

When extending this frontend:
- Keep the current Kanban interactions working while integrating backend data
- Prefer adapting the existing `BoardData` shape instead of inventing a second frontend model
- Do not add unnecessary UI settings or configuration surfaces
- Keep auth, persistence, and AI additions incremental and easy to test
- Preserve stable test selectors such as `data-testid` values unless tests are updated together

## Integration expectations

Planned evolution of this frontend:
- First, the built frontend will be served by FastAPI
- Then login gating will be added
- Then the in-memory board will be replaced with backend-backed persistence
- Finally, an AI chat sidebar will be added without disrupting the board workflow

The safest implementation path is to treat the current board UI as the baseline product behavior and layer backend capabilities underneath it.
