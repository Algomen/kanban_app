import json
import sqlite3
from pathlib import Path
from typing import Any

DEFAULT_USERNAME = "user"

INITIAL_BOARD_DATA = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
        {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
        {
            "id": "col-progress",
            "title": "In Progress",
            "cardIds": ["card-4", "card-5"],
        },
        {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
        {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
    ],
    "cards": {
        "card-1": {
            "id": "card-1",
            "title": "Align roadmap themes",
            "details": "Draft quarterly themes with impact statements and metrics.",
        },
        "card-2": {
            "id": "card-2",
            "title": "Gather customer signals",
            "details": "Review support tags, sales notes, and churn feedback.",
        },
        "card-3": {
            "id": "card-3",
            "title": "Prototype analytics view",
            "details": "Sketch initial dashboard layout and key drill-downs.",
        },
        "card-4": {
            "id": "card-4",
            "title": "Refine status language",
            "details": "Standardize column labels and tone across the board.",
        },
        "card-5": {
            "id": "card-5",
            "title": "Design card layout",
            "details": "Add hierarchy and spacing for scanning dense lists.",
        },
        "card-6": {
            "id": "card-6",
            "title": "QA micro-interactions",
            "details": "Verify hover, focus, and loading states.",
        },
        "card-7": {
            "id": "card-7",
            "title": "Ship marketing page",
            "details": "Final copy approved and asset pack delivered.",
        },
        "card-8": {
            "id": "card-8",
            "title": "Close onboarding sprint",
            "details": "Document release notes and share internally.",
        },
    },
}


class BoardStore:
    def __init__(self, db_path: Path):
        self.db_path = db_path

    def initialize(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        with self._connect() as connection:
            connection.execute("PRAGMA foreign_keys = ON")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT NOT NULL UNIQUE,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS boards (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL UNIQUE,
                  board_json TEXT NOT NULL,
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
            connection.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_boards_user_id
                ON boards(user_id)
                """
            )
            user_id = self._ensure_user(connection, DEFAULT_USERNAME)
            self._ensure_board(connection, user_id)
            connection.commit()

    def get_board(self, username: str = DEFAULT_USERNAME) -> dict[str, Any]:
        self.initialize()

        with self._connect() as connection:
            user_id = self._ensure_user(connection, username)
            self._ensure_board(connection, user_id)
            row = connection.execute(
                """
                SELECT board_json
                FROM boards
                WHERE user_id = ?
                """,
                (user_id,),
            ).fetchone()
            connection.commit()

        if row is None:
            raise RuntimeError("Board row was not created for the MVP user.")

        return json.loads(row["board_json"])

    def save_board(self, board: dict[str, Any], username: str = DEFAULT_USERNAME) -> None:
        self.initialize()

        with self._connect() as connection:
            user_id = self._ensure_user(connection, username)
            self._ensure_board(connection, user_id)
            connection.execute(
                """
                UPDATE boards
                SET board_json = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """,
                (json.dumps(board), user_id),
            )
            connection.commit()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_user(self, connection: sqlite3.Connection, username: str) -> int:
        connection.execute(
            "INSERT OR IGNORE INTO users (username) VALUES (?)",
            (username,),
        )
        row = connection.execute(
            "SELECT id FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if row is None:
            raise RuntimeError("Failed to create or load user.")
        return int(row["id"])

    def _ensure_board(self, connection: sqlite3.Connection, user_id: int) -> None:
        connection.execute(
            """
            INSERT OR IGNORE INTO boards (user_id, board_json)
            VALUES (?, ?)
            """,
            (user_id, json.dumps(INITIAL_BOARD_DATA)),
        )
