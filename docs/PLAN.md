# Project Plan

This document is the execution plan for the Project Management MVP. It is intentionally detailed enough to guide implementation and testing, but stays focused on the agreed MVP scope.

Assumptions:
- The immediate goal is to approve this plan before implementation starts.
- Local development should be optimized for the Docker/container flow.
- AI integration will use OpenRouter with the `openai/gpt-oss-120b` model, matching [AGENTS.md](/Users/alvaro.gomezmendez/projects/pm/pm/AGENTS.md).
- The current `frontend/` app is the baseline UI to preserve and progressively integrate into the full stack app.

## Part 1: Planning and frontend documentation

Checklist:
- [ ] Expand this plan into actionable substeps, tests, and success criteria.
- [ ] Review the existing `frontend/` code to document structure, behavior, and test coverage.
- [ ] Create `frontend/AGENTS.md` describing the current frontend app and constraints.
- [ ] Pause for user approval before any implementation work begins.

Tests:
- Manual review of this document for scope alignment and sequencing.
- Manual review of `frontend/AGENTS.md` for accuracy against the current codebase.

Success criteria:
- The plan covers all ten parts with concrete implementation and validation steps.
- The plan is aligned with `AGENTS.md`.
- The user explicitly approves the plan before implementation starts.

## Part 2: Scaffolding

Checklist:
- [ ] Create backend service structure in `backend/` using FastAPI.
- [ ] Add Python project metadata and dependency management based on `uv`.
- [ ] Add Dockerfile and any supporting container config required to build and run the app locally.
- [ ] Add start/stop scripts for Mac, Linux, and Windows under `scripts/`.
- [ ] Make the backend serve a minimal static page at `/`.
- [ ] Add at least one simple API route, such as `/api/health` or `/api/hello`.
- [ ] Ensure the container startup path is the primary local run path.
- [ ] Document the minimum run steps in a concise README section if needed.

Tests:
- Backend unit test for the hello/health endpoint.
- Manual container test: build image, start container, verify `/` returns static HTML.
- Manual API test: call the example API route from outside the container.

Success criteria:
- A user can start the app via the provided script and reach the app locally in Docker.
- The backend serves both a static page and a working API response.
- The setup is minimal and reproducible from a clean environment.

## Part 3: Add in frontend

Checklist:
- [ ] Decide how the Next.js frontend will be built for delivery through the FastAPI app.
- [ ] Add the frontend build step to the Docker flow.
- [ ] Serve the built frontend from FastAPI at `/`.
- [ ] Preserve the current Kanban demo behavior and styling.
- [ ] Ensure static assets load correctly when served by the backend.
- [ ] Keep the frontend test setup working after integration changes.

Tests:
- Existing frontend unit tests still pass.
- Existing frontend e2e tests still pass against the integrated app.
- Manual browser test of `/` through the backend-served app.

Success criteria:
- Visiting `/` shows the existing Kanban UI, served through FastAPI.
- No frontend behavior regresses relative to the current demo.
- The Dockerized app is now serving the real frontend rather than placeholder HTML.

## Part 4: Fake sign-in experience

Checklist:
- [ ] Add a login screen shown before board access.
- [ ] Implement dummy credential validation for `user` / `password`.
- [ ] Choose the simplest session mechanism compatible with the later backend-backed flow.
- [ ] Add logout behavior that clears the signed-in state.
- [ ] Ensure direct access to the board requires authentication state.
- [ ] Keep the UI simple and consistent with the current visual language.

Tests:
- Frontend tests for rendering the login form and validation messages.
- Integration/e2e test for successful login and logout.
- Integration/e2e test for rejected credentials.

Success criteria:
- An unauthenticated visitor sees login first.
- Only the dummy credentials allow access.
- Logging out returns the app to the login screen.

## Part 5: Database modeling

Checklist:
- [ ] Propose a SQLite schema that supports multiple users and one board per user for MVP.
- [ ] Store board state as JSON, while keeping the schema open for future extension.
- [ ] Decide how seeded/default board data is created for a new user.
- [ ] Document the schema and reasoning in `docs/`.
- [ ] Pause for user approval before implementing the persistent model.

Tests:
- Schema review against MVP requirements.
- Manual validation that the proposed shape supports future multi-user extension.

Success criteria:
- The schema is documented clearly and minimally.
- The design supports one board per user now without blocking future growth.
- The user approves the database approach before implementation continues.

## Part 6: Backend board API

Checklist:
- [ ] Add SQLite access layer in the backend.
- [ ] Create the database automatically if it does not exist.
- [ ] Add backend logic to create/fetch the single board for the signed-in user.
- [ ] Add API routes to read the board.
- [ ] Add API routes to update the board.
- [ ] Keep the API payload shape simple and close to the frontend board model.
- [ ] Add input validation and clear error handling.

Tests:
- Backend unit tests for database initialization.
- Backend unit tests for board fetch/create behavior.
- Backend API tests for valid updates and invalid payload rejection.

Success criteria:
- Starting the app with no database creates one automatically.
- The backend can persist and return the board for the MVP user.
- Invalid requests fail cleanly and predictably.

## Part 7: Frontend and backend integration

Checklist:
- [ ] Replace in-memory board state initialization with backend fetch on load.
- [ ] Persist column rename, card create, card edit, card delete, and drag/drop move via API.
- [ ] Add loading and error handling that stays minimal.
- [ ] Keep the existing interaction model intact.
- [ ] Ensure refreshes show persisted board state.

Tests:
- Frontend integration tests around data loading and persistence behavior.
- Backend API tests remain green.
- E2E test covering login, board load, edit, refresh, and persisted result.

Success criteria:
- The board is now persistent across refreshes.
- Core Kanban interactions work against the backend without noticeable regressions.
- The UI remains simple and stable.

## Part 8: AI connectivity

Checklist:
- [ ] Add backend configuration loading for `OPENROUTER_API_KEY`.
- [ ] Add a small OpenRouter client in the backend.
- [ ] Configure the model as `openai/gpt-oss-120b`.
- [ ] Add a simple backend route or internal check to test AI connectivity.
- [ ] Keep secrets out of the frontend and out of logs.

Tests:
- Backend test for missing API key handling.
- Manual connectivity test using a simple prompt such as `2+2`.
- Manual verification that the backend returns the model response successfully.

Success criteria:
- The backend can successfully call OpenRouter with the configured model.
- Missing or invalid credentials fail with a clear backend error.
- AI connectivity is proven before any board-modifying AI logic is added.

## Part 9: Structured AI board updates

Checklist:
- [ ] Define the request payload sent to the model: board JSON, user message, and conversation history.
- [ ] Define the structured response schema: assistant reply plus optional board update.
- [ ] Implement backend prompt construction with strict, minimal instructions.
- [ ] Validate and parse the model response before applying any board updates.
- [ ] Persist approved board updates through the same backend storage layer.
- [ ] Return both the assistant message and any resulting board state to the frontend.

Tests:
- Backend tests for response parsing and schema validation.
- Backend tests for no-op responses, message-only responses, and board-update responses.
- Manual tests with representative prompts for create, edit, and move operations.

Success criteria:
- The backend always sends full board context and conversation history as designed.
- Structured responses are validated before use.
- AI-generated board updates can be applied safely and deterministically.

## Part 10: AI sidebar UI

Checklist:
- [ ] Add a sidebar chat interface to the frontend.
- [ ] Show conversation history and pending/loading state.
- [ ] Send user messages to the backend AI endpoint.
- [ ] Update the visible board automatically when the AI response includes a board change.
- [ ] Keep the sidebar visually aligned with the existing design system.
- [ ] Ensure the board remains usable while the AI sidebar exists.

Tests:
- Frontend component tests for chat rendering and submit behavior.
- Frontend integration tests for AI responses that do and do not modify the board.
- E2E test covering a full chat round-trip with a board update.

Success criteria:
- The user can chat with the AI from the sidebar.
- AI-issued board changes appear in the UI automatically.
- The combined experience remains coherent, responsive, and MVP-simple.

## Cross-cutting rules

Implementation rules:
- Keep changes minimal and directly tied to the current part.
- Prefer simple data shapes and straightforward API contracts.
- Do not add extra features outside the agreed MVP.
- Preserve the established color palette and overall visual tone.

Testing rules:
- Add tests alongside each part instead of deferring quality to the end.
- Favor unit tests for pure logic, backend tests for API and persistence, and e2e tests for core user flows.
- When a bug appears, identify the root cause before changing code.

Approval gates:
- Approval required after Part 1 plan/documentation.
- Approval required after Part 5 database design documentation.
