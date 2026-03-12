from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.board_store import BoardStore
from app.schemas import BoardModel

PLACEHOLDER_PAGE = """\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PM MVP</title>
    <style>
      :root {
        --accent-yellow: #ecad0a;
        --primary-blue: #209dd7;
        --secondary-purple: #753991;
        --navy-dark: #032147;
        --gray-text: #888888;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(32, 157, 215, 0.2), transparent 35%),
          radial-gradient(circle at bottom right, rgba(117, 57, 145, 0.16), transparent 35%),
          #f7f8fb;
        color: var(--navy-dark);
      }

      main {
        max-width: 720px;
        margin: 0 auto;
        padding: 72px 24px;
      }

      .panel {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(3, 33, 71, 0.08);
        border-radius: 28px;
        padding: 32px;
        box-shadow: 0 18px 40px rgba(3, 33, 71, 0.12);
      }

      .eyebrow {
        margin: 0;
        color: var(--gray-text);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.3em;
        text-transform: uppercase;
      }

      h1 {
        margin: 16px 0 12px;
        font-size: 42px;
        line-height: 1.1;
      }

      p {
        margin: 0;
        color: var(--gray-text);
        line-height: 1.6;
      }

      code {
        color: var(--secondary-purple);
        font-weight: 700;
      }

      .callout {
        margin-top: 24px;
        padding-left: 16px;
        border-left: 4px solid var(--accent-yellow);
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <p class="eyebrow">Project Management MVP</p>
        <h1>Backend scaffold is running.</h1>
        <p>
          This is the Part 2 placeholder page served by FastAPI. The real Next.js
          frontend will replace this page in Part 3.
        </p>
        <p class="callout">
          API check: <code>GET /api/hello</code>
        </p>
      </section>
    </main>
  </body>
</html>
"""

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
FRONTEND_EXPORT_DIR = REPO_ROOT / "frontend" / "out"
DATABASE_PATH = REPO_ROOT / "backend" / "data" / "pm.sqlite3"


def create_app(
    frontend_dir: Path | None = None,
    db_path: Path | None = None,
) -> FastAPI:
    app = FastAPI(title="PM MVP Backend")
    board_store = BoardStore(db_path or DATABASE_PATH)

    @app.on_event("startup")
    async def initialize_database() -> None:
        board_store.initialize()

    @app.get("/api/hello")
    async def hello() -> dict[str, str]:
        return {"message": "hello from fastapi"}

    @app.get("/api/board", response_model=BoardModel)
    async def get_board() -> BoardModel:
        return BoardModel.model_validate(board_store.get_board())

    @app.put("/api/board", response_model=BoardModel)
    async def update_board(board: BoardModel) -> BoardModel:
        try:
            normalized_board = board.model_dump()
            board_store.save_board(normalized_board)
            return BoardModel.model_validate(normalized_board)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    resolved_frontend_dir = frontend_dir or FRONTEND_EXPORT_DIR
    if resolved_frontend_dir.exists():
        app.mount(
            "/",
            StaticFiles(directory=resolved_frontend_dir, html=True),
            name="frontend",
        )
        return app

    @app.get("/", response_class=HTMLResponse)
    async def index() -> HTMLResponse:
        return HTMLResponse(content=PLACEHOLDER_PAGE)

    return app


app = create_app()
