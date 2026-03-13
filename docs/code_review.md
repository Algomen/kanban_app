# Code Review Report

**Date**: 2026-03-13
**Scope**: Full repository — frontend, backend, tests, config, Docker

---

## Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| Critical | 2 | 1 (C1 operational guidance only) |
| High | 5 | 4 |
| Medium | 13 | 7 |
| Low | 9 | — |

**Fixed in this pass**: H2, H4, H5, M2 (partial via H2 fix), M3, M4, M5, M6, M8, M12 — plus new tests covering each change.

The most urgent issues are a committed API key and hardcoded auth credentials. A number of medium-severity bugs and architecture concerns follow. The codebase is otherwise clean and well-structured for an MVP.

---

## Critical

### C1 — API Key Stored in `.env` on Disk
**File**: `.env`
**Issue**: The Azure AI Foundry API key lives in a plain-text `.env` file. While `.env` is correctly excluded from git, the key is still at risk if the file is accidentally copied, shared, or if the machine is compromised.
**Action**: Rotate the key periodically. For any shared or production deployment, inject the secret via Docker `--env-file` passed at runtime or an external secrets manager — never bake it into a container image or committed config file.

### C2 — Hardcoded Credentials in Frontend Source
**File**: `frontend/src/components/AuthShell.tsx:8-9`
**Issue**: `VALID_USERNAME = "user"` and `VALID_PASSWORD = "password"` are constants in source code and displayed in the login UI.
**Action**: Acceptable for a local demo MVP but must never reach a shared or production environment. Add a prominent warning comment and document the limitation. If this ever becomes multi-user, replace with server-side auth.

---

## High

### H1 — localStorage Flag Used as Authentication
**File**: `frontend/src/components/AuthShell.tsx:7, 139, 160`
**Issue**: Auth state is stored as the string `"true"` in localStorage under key `pm-authenticated`. Any script or user typing `localStorage.setItem("pm-authenticated", "true")` in the browser console bypasses login entirely.
**Action**: For the current local-only MVP this is low practical risk, but document it clearly. If the app ever gets a real backend auth layer, replace with httpOnly session cookies or JWTs.

### H2 — Race Condition in Board Persistence
**File**: `frontend/src/components/KanbanBoard.tsx:69-84`
**Issue**: `skipNextPersistRef` is a single boolean. If `initialBoard` changes while a 250 ms debounce is in flight (e.g. an AI update arrives mid-drag), the flag can misfire and either suppress a legitimate save or let a stale one through.
**Action**: Replace the boolean flag with a counter or timestamp. On each AI-triggered update, increment the counter; skip persist only when the current counter matches the snapshot taken at update time.

### H3 — Missing Tests for AI Sidebar Integration
**File**: `frontend/src/components/AuthShell.tsx:205-245`
**Issue**: `handleAiSubmit` (fetch, error handling, board merge) has no unit tests. The full round-trip is only exercised by E2E tests, making regressions hard to locate.
**Action**: Add Vitest unit tests for: successful response with board update, AI error response, network failure, and malformed JSON in AI reply.

### H4 — Unhandled Promise Rejection in Chat Submit
**File**: `frontend/src/components/KanbanBoard.tsx:172-182`
**Issue**: The call to `await onAiSubmit(message)` is not wrapped in try/catch. If the prop rejects, an unhandled promise rejection is logged and no UI feedback is shown.
**Action**: Wrap the call in try/catch. Show an error state to the user on failure.

### H5 — No Rate Limiting on AI Endpoint
**File**: `backend/app/main.py` — `POST /api/ai/board`
**Issue**: The AI endpoint makes an upstream call to Azure for every request with no throttling, token budgeting, or per-session limits.
**Action**: Add a simple request rate limit (e.g. via `slowapi`) and/or a maximum message length check before forwarding to the AI service.

---

## Medium

### M1 — Duplicated Board Seed Data
**Files**: `backend/app/board_store.py:8-62`, `frontend/src/lib/kanban.ts:28-82`
**Issue**: The initial board structure is defined independently in both Python and TypeScript. They must be kept in sync manually.
**Action**: Make the backend the single source of truth. The frontend should fetch the initial board from `GET /api/board` rather than falling back to a local copy. Remove the frontend seed.

### M2 — Debounce May Lose Final User Action on Unmount
**File**: `frontend/src/components/KanbanBoard.tsx:79-84`
**Issue**: The `useEffect` cleanup clears the debounce timeout on unmount. If a user drags a card and immediately navigates away (e.g. logs out), the final state is never persisted.
**Action**: On unmount, flush any pending debounce synchronously using a ref that holds the latest board state and calls the API directly.

### M3 — Chat Input Causes Full Board Re-render
**File**: `frontend/src/components/KanbanBoard.tsx:54, 330-336`
**Issue**: `chatInput` state lives in `KanbanBoard`, so every keystroke triggers a re-render of the entire board tree including all columns and cards.
**Action**: Extract the chat input into a separate memoized component (`ChatInput`) that manages its own local state and only calls the parent's `onAiSubmit` on form submission.

### M4 — No Rollback on Failed Board Save
**File**: `frontend/src/components/AuthShell.tsx:178-203`
**Issue**: When `PUT /api/board` fails, an error is shown but the in-memory board state is not rolled back. The user sees a state that has not been persisted, and a reload will show older data.
**Action**: Keep a `lastPersistedBoard` ref. On save failure, offer the user the option to revert to the last known good state or retry.

### M5 — AI Prompt Injection / Missing Input Validation
**File**: `backend/app/ai.py:152-159`
**Issue**: User messages are embedded directly in the JSON payload sent to the AI with no length cap, no sanitization, and no escaping of special characters.
**Action**: Enforce a max message length (e.g. 2000 chars) in the Pydantic schema. Consider stripping or escaping control characters before embedding in the AI prompt.

### M6 — Board Response Parsing Has No Fallback
**File**: `backend/app/ai.py:162-183`
**Issue**: If the AI response fails validation in `_parse_board_response()`, the endpoint raises an error with no fallback. The original board is not returned.
**Action**: Catch validation errors and return the unmodified board with a warning message, rather than a 500 error.

### M7 — Magic String Column IDs
**Files**: Multiple (`KanbanBoard.tsx`, `board_store.py`, `kanban.ts`)
**Issue**: Column IDs such as `"col-backlog"`, `"col-in-progress"`, `"col-review"`, `"col-done"` are repeated as raw strings across backend and frontend.
**Action**: Define them as a shared constant/enum in a single location on each side, and reference the constant everywhere.

### M8 — No Tests for `moveCard` Edge Cases
**File**: `frontend/src/lib/kanban.test.ts`
**Issue**: Tests cover the happy path but not: moving a non-existent card, referencing a non-existent column, columns with duplicate card IDs, or empty card lists.
**Action**: Add test cases for each invalid-input scenario and verify the function either throws clearly or returns a safe result.

### M9 — No CORS Configuration Documented
**File**: `backend/app/main.py`
**Issue**: CORS is not explicitly configured. The static + single-origin deployment means this is probably fine today, but it is not documented and easy to break.
**Action**: Explicitly set `CORSMiddleware` with `allow_origins=["http://localhost"]` (or the appropriate origin). Document why the current setting is safe.

### M10 — Loose Python Dependency Pins
**File**: `backend/pyproject.toml:6-11`
**Issue**: All backend dependencies use `>=` lower bounds only (e.g. `fastapi>=0.118.0,<1.0.0`). A minor-version bump in a transitive dependency could introduce a breaking change silently.
**Action**: Use `uv lock` to generate a lockfile (`uv.lock`) and commit it, ensuring reproducible installs.

### M11 — Missing `moveCard` Orphaned Card Check
**File**: `frontend/src/lib/kanban.ts:94-172`
**Issue**: `moveCard` does not verify that all card IDs referenced in column `cardIds` arrays actually exist in `cards`. Inconsistent board data causes silent card loss.
**Action**: Add an assertion (or runtime check) at the start of `moveCard` that all referenced card IDs resolve in the `cards` map.

### M12 — No Timeout Surfaced to User for AI Calls
**File**: `backend/app/ai.py` — httpx timeout is set but not communicated clearly
**Issue**: If the AI upstream is slow, the frontend has no indication of progress and the request may silently time out after 30 s.
**Action**: Return a structured timeout error from the backend and display it in the chat UI. Consider adding a frontend timeout/spinner.

### M13 — Docker `uv` Image Pinned to Patch Version
**File**: `Dockerfile:19`
**Issue**: `ghcr.io/astral-sh/uv:0.8.15` is pinned to a specific patch. Security fixes in newer patches won't be picked up automatically.
**Action**: Pin to a minor version (`uv:0.8`) or set up a regular review/update cadence.

---

## Low

### L1 — Dead Code: `KanbanCardPreview`
**File**: `frontend/src/components/KanbanCardPreview.tsx`
**Issue**: Component is imported in `KanbanBoard.tsx:15` but never rendered. `KanbanCardOverlay` (`KanbanCard.tsx:86`) is used instead.
**Action**: Delete the file and remove the import. This reduces bundle size and avoids confusion.

### L2 — Inconsistent Error Message Formatting
**Files**: `AuthShell.tsx:156`, `ai.py:51, 65`
**Issue**: Error messages follow different conventions (some are sentence case, some all-lower) and are scattered across files.
**Action**: Centralise user-facing error strings; adopt a single convention.

### L3 — No `mypy` / Type Checking in Backend
**File**: `backend/pyproject.toml`
**Issue**: No static type checker is configured. Type errors in Python are discovered at runtime.
**Action**: Add `mypy` (or `pyright`) to dev dependencies and add a `[tool.mypy]` section to `pyproject.toml`. Run it in CI.

### L4 — E2E Tests Cover Only the Happy Path
**File**: `frontend/tests/kanban.spec.ts`
**Issue**: Only 3 high-level E2E tests exist. No coverage of failed API calls, AI errors, or invalid board data returned from the server.
**Action**: Add E2E scenarios for: backend down (board fetch fails), AI returns error, drag-and-drop with 0 cards in a column.

### L5 — No OpenAPI Documentation Exposed
**File**: `backend/app/main.py`
**Issue**: FastAPI auto-generates `/docs` and `/redoc` but there is no evidence this is tested or used. Schema descriptions are absent from most routes.
**Action**: Add `summary` and `description` to all route decorators, and add a smoke test that `/docs` returns 200.

### L6 — `node:22` Base Image — Verify LTS Status
**File**: `Dockerfile:1`
**Issue**: Node 22 is current LTS as of March 2026, but this should be reviewed quarterly.
**Action**: Track Node LTS schedule and update the Dockerfile when a new LTS is released.

### L7 — No Dependabot / Automated Dependency Scanning
**Issue**: No `.github/dependabot.yml` or equivalent. Dependency vulnerabilities are not surfaced automatically.
**Action**: Add a Dependabot config for both `npm` (frontend) and `pip` (backend) to auto-open PRs for dependency updates.

### L8 — No Request ID / Correlation Logging
**File**: `backend/app/main.py`, `backend/app/ai.py`
**Issue**: Log lines have no request correlation ID, making it hard to trace a single request across log entries.
**Action**: Add a middleware that generates a `request_id` (UUID) per request and includes it in all log output and in the response headers.

### L9 — Potential XSS via AI-Generated Card Content
**File**: `frontend/src/components/KanbanCard.tsx:41-46`
**Issue**: React escapes string content by default, so this is low risk today. However, if `dangerouslySetInnerHTML` is ever added (e.g. for markdown rendering), AI-generated content becomes an XSS vector.
**Action**: Document this risk and, if markdown rendering is added in future, integrate `DOMPurify` before rendering.

---

## Strengths

- Clean component separation between `AuthShell` (auth + AI sidebar) and `KanbanBoard` (board state + drag/drop).
- Pydantic schemas on the backend provide solid input validation for all API routes.
- Sensible Vitest unit test coverage for core `kanban.ts` logic.
- `useMemo` for `cardsById` and `columnIds` avoids most gratuitous re-computations.
- Debounce on board persistence is a good pattern; the implementation just needs the edge cases hardened (see H2, M2).
- Docker build is clean and single-container, appropriate for the MVP scope.

---

## Recommended Action Order

1. **Immediately**: Rotate the Azure API key (C1) if it has been exposed outside this machine.
2. **Before any wider sharing**: Address H2 (race condition) and H4 (unhandled rejection).
3. **Next sprint**: M1 (single seed source), M3 (chat input re-renders), M4 (no rollback on save failure), M5 (input validation for AI).
4. **Backlog**: Remaining medium and low items as capacity allows.
