import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from app.ai import (
    AIBoardResult,
    AIClientError,
    AIConnectivityResult,
    _parse_board_response,
)
from app.main import create_app


class FakeAIClient:
    def __init__(
        self,
        connectivity_result: AIConnectivityResult | None = None,
        board_result: AIBoardResult | None = None,
        error: Exception | None = None,
    ):
        self._connectivity_result = connectivity_result
        self._board_result = board_result
        self._error = error

    async def test_connectivity(self, prompt: str) -> AIConnectivityResult:
        if self._error is not None:
            raise self._error
        assert self._connectivity_result is not None
        return self._connectivity_result

    async def respond_about_board(self, board, message, history) -> AIBoardResult:
        if self._error is not None:
            raise self._error
        assert self._board_result is not None
        return self._board_result


def test_index_serves_placeholder_html_without_frontend_export(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=tmp_path / "pm.sqlite3",
        )
    )
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Backend scaffold is running." in response.text


def test_hello_endpoint(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=tmp_path / "pm.sqlite3",
        )
    )
    response = client.get("/api/hello")

    assert response.status_code == 200
    assert response.json() == {"message": "hello from fastapi"}


def test_index_serves_static_frontend_when_export_exists(tmp_path: Path) -> None:
    (tmp_path / "index.html").write_text(
        "<!doctype html><html><body><h1>Kanban Studio</h1></body></html>",
        encoding="utf-8",
    )
    client = TestClient(create_app(frontend_dir=tmp_path, db_path=tmp_path / "pm.sqlite3"))

    response = client.get("/")

    assert response.status_code == 200
    assert "Kanban Studio" in response.text


def test_board_endpoint_creates_database_and_returns_seeded_board(tmp_path: Path) -> None:
    db_path = tmp_path / "data" / "pm.sqlite3"
    client = TestClient(
        create_app(frontend_dir=Path("/tmp/does-not-exist"), db_path=db_path)
    )

    response = client.get("/api/board")

    assert response.status_code == 200
    assert db_path.exists()
    assert response.json()["columns"][0]["title"] == "Backlog"

    with sqlite3.connect(db_path) as connection:
        users = connection.execute("SELECT username FROM users").fetchall()
        boards = connection.execute("SELECT COUNT(*) FROM boards").fetchone()

    assert users == [("user",)]
    assert boards == (1,)


def test_board_endpoint_updates_persisted_board(tmp_path: Path) -> None:
    db_path = tmp_path / "data" / "pm.sqlite3"
    client = TestClient(
        create_app(frontend_dir=Path("/tmp/does-not-exist"), db_path=db_path)
    )

    board = client.get("/api/board").json()
    board["columns"][0]["title"] = "Updated Backlog"

    update_response = client.put("/api/board", json=board)
    fetch_response = client.get("/api/board")

    assert update_response.status_code == 200
    assert fetch_response.status_code == 200
    assert fetch_response.json()["columns"][0]["title"] == "Updated Backlog"


def test_board_endpoint_rejects_invalid_payload(tmp_path: Path) -> None:
    db_path = tmp_path / "data" / "pm.sqlite3"
    client = TestClient(
        create_app(frontend_dir=Path("/tmp/does-not-exist"), db_path=db_path)
    )

    response = client.put(
        "/api/board",
        json={
            "columns": [
                {"id": "col-backlog", "title": "Backlog", "cardIds": ["missing-card"]}
            ],
            "cards": {},
        },
    )

    assert response.status_code == 422


def test_ai_connectivity_returns_model_output(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=tmp_path / "pm.sqlite3",
            ai_client=FakeAIClient(
                connectivity_result=AIConnectivityResult(
                    model="gpt-5.3-chat",
                    output_text="4",
                )
            ),
        )
    )

    response = client.post("/api/ai/connectivity", json={"prompt": "2+2"})

    assert response.status_code == 200
    assert response.json() == {"model": "gpt-5.3-chat", "output_text": "4"}


def test_ai_connectivity_returns_clear_error_when_config_missing(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("AI_FOUNDRY_ENDPOINT", "")
    monkeypatch.setenv("AI_FOUNDRY_KEY", "")
    monkeypatch.setenv("AI_FOUNDRY_MODEL", "")

    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=tmp_path / "pm.sqlite3",
        )
    )

    response = client.post("/api/ai/connectivity", json={"prompt": "2+2"})

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Missing required AI configuration: AI_FOUNDRY_ENDPOINT, AI_FOUNDRY_KEY, AI_FOUNDRY_MODEL."
    }


def test_ai_connectivity_returns_backend_error_when_foundry_call_fails(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=tmp_path / "pm.sqlite3",
            ai_client=FakeAIClient(error=AIClientError("AI Foundry request failed.")),
        )
    )

    response = client.post("/api/ai/connectivity", json={"prompt": "2+2"})

    assert response.status_code == 502
    assert response.json() == {"detail": "AI Foundry request failed."}


def test_ai_board_endpoint_returns_message_only_response(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=tmp_path / "data" / "pm.sqlite3",
            ai_client=FakeAIClient(
                board_result=AIBoardResult(
                    model="gpt-5.3-chat",
                    assistant_message="No board changes needed.",
                    board=None,
                )
            ),
        )
    )

    board = client.get("/api/board").json()
    response = client.post(
        "/api/ai/board",
        json={
            "board": board,
            "message": "Summarize the current board.",
            "history": [],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "assistantMessage": "No board changes needed.",
        "board": None,
    }


def test_ai_board_endpoint_persists_valid_board_update(tmp_path: Path) -> None:
    db_path = tmp_path / "data" / "pm.sqlite3"
    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=db_path,
            ai_client=FakeAIClient(
                board_result=AIBoardResult(
                    model="gpt-5.3-chat",
                    assistant_message="Moved the card to Review.",
                    board={
                        "columns": [
                            {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-2"]},
                            {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
                            {
                                "id": "col-progress",
                                "title": "In Progress",
                                "cardIds": ["card-4", "card-5"],
                            },
                            {"id": "col-review", "title": "Review", "cardIds": ["card-6", "card-1"]},
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
                    },
                )
            ),
        )
    )

    board = client.get("/api/board").json()
    response = client.post(
        "/api/ai/board",
        json={
            "board": board,
            "message": "Move 'Align roadmap themes' to Review.",
            "history": [{"role": "user", "content": "Help me organize this board."}],
        },
    )
    fetch_response = client.get("/api/board")

    assert response.status_code == 200
    assert response.json()["assistantMessage"] == "Moved the card to Review."
    assert response.json()["board"]["columns"][3]["cardIds"] == ["card-6", "card-1"]
    assert fetch_response.status_code == 200
    assert fetch_response.json()["columns"][3]["cardIds"] == ["card-6", "card-1"]


def test_ai_board_endpoint_rejects_invalid_board_update(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=tmp_path / "data" / "pm.sqlite3",
            ai_client=FakeAIClient(
                error=AIClientError("AI response did not match the expected schema.")
            ),
        )
    )

    board = client.get("/api/board").json()
    response = client.post(
        "/api/ai/board",
        json={
            "board": board,
            "message": "Break the board.",
            "history": [],
        },
    )

    assert response.status_code == 502
    assert response.json() == {
        "detail": "AI response did not match the expected schema."
    }


def test_parse_board_response_accepts_message_only_payload() -> None:
    result = _parse_board_response(
        "gpt-5.3-chat",
        '{"assistantMessage":"No board changes needed.","board":null}',
    )

    assert result.model == "gpt-5.3-chat"
    assert result.assistant_message == "No board changes needed."
    assert result.board is None


def test_parse_board_response_rejects_non_json_output() -> None:
    try:
        _parse_board_response("gpt-5.3-chat", "not json")
    except AIClientError as exc:
        assert str(exc) == "AI response was not valid JSON."
    else:
        raise AssertionError("Expected AIClientError for invalid JSON output.")


def test_ai_board_endpoint_rejects_message_too_long(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=tmp_path / "data" / "pm.sqlite3",
            ai_client=FakeAIClient(),
        )
    )

    board = client.get("/api/board").json()
    response = client.post(
        "/api/ai/board",
        json={
            "board": board,
            "message": "x" * 2001,
            "history": [],
        },
    )

    assert response.status_code == 422


def test_ai_board_endpoint_accepts_message_at_max_length(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=tmp_path / "data" / "pm.sqlite3",
            ai_client=FakeAIClient(
                board_result=AIBoardResult(
                    model="gpt-5.3-chat",
                    assistant_message="OK.",
                    board=None,
                )
            ),
        )
    )

    board = client.get("/api/board").json()
    response = client.post(
        "/api/ai/board",
        json={
            "board": board,
            "message": "x" * 2000,
            "history": [],
        },
    )

    assert response.status_code == 200


def test_ai_board_endpoint_returns_graceful_message_on_parse_failure(tmp_path: Path) -> None:
    """When the AI returns a response that cannot be parsed into a valid board,
    the endpoint should return 200 with a helpful message rather than a 502."""
    client = TestClient(
        create_app(
            frontend_dir=Path("/tmp/does-not-exist"),
            db_path=tmp_path / "data" / "pm.sqlite3",
            ai_client=FakeAIClient(
                board_result=AIBoardResult(
                    model="gpt-5.3-chat",
                    assistant_message="I wasn't able to format a board update. Please try rephrasing your request.",
                    board=None,
                )
            ),
        )
    )

    board = client.get("/api/board").json()
    response = client.post(
        "/api/ai/board",
        json={"board": board, "message": "Break things.", "history": []},
    )

    assert response.status_code == 200
    assert "wasn't able to format" in response.json()["assistantMessage"]
    assert response.json()["board"] is None


def test_parse_board_response_rejects_invalid_board_schema() -> None:
    try:
        _parse_board_response(
            "gpt-5.3-chat",
            """
            {
              "assistantMessage": "Updated the board.",
              "board": {
                "columns": [
                  {"id": "col-backlog", "title": "Backlog", "cardIds": ["missing-card"]}
                ],
                "cards": {}
              }
            }
            """,
        )
    except AIClientError as exc:
        assert str(exc) == "AI response did not match the expected schema."
    else:
        raise AssertionError("Expected AIClientError for invalid board schema.")
