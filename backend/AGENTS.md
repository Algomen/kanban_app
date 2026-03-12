This directory contains the FastAPI backend for the Project Management MVP.

Current scope in Part 2:
- `app/main.py`: minimal FastAPI app
- `tests/test_main.py`: backend tests for the scaffold routes
- `pyproject.toml`: backend Python dependencies managed with `uv`

Current behavior:
- Serves the statically exported frontend from `frontend/out` when present
- Falls back to a placeholder HTML page at `/` when the frontend export is absent
- Serves a simple JSON endpoint at `/api/hello`

Constraints:
- Keep the backend simple and incremental
- Optimize local execution for the Docker container flow
- Use `uv` for Python dependency management inside the container
- Avoid adding database or AI logic before the planned parts
