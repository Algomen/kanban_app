This directory contains the FastAPI backend for the Project Management MVP.

Current scope in Part 2:
- `app/main.py`: FastAPI app and route wiring
- `app/board_store.py`: SQLite persistence and default board seeding
- `app/schemas.py`: request/response validation models
- `tests/test_main.py`: backend tests for scaffold and board API routes
- `pyproject.toml`: backend Python dependencies managed with `uv`

Current behavior:
- Serves the statically exported frontend from `frontend/out` when present
- Falls back to a placeholder HTML page at `/` when the frontend export is absent
- Serves a simple JSON endpoint at `/api/hello`
- Creates a SQLite database automatically if it is missing
- Seeds the MVP user `user` and a default board automatically
- Serves `GET /api/board` and `PUT /api/board`

Constraints:
- Keep the backend simple and incremental
- Optimize local execution for the Docker container flow
- Use `uv` for Python dependency management inside the container
- Keep the board payload close to the frontend `BoardData` shape
- Avoid adding AI logic before the planned parts
