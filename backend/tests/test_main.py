import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from app.ai import AIClientError, AIConnectivityResult
from app.main import create_app


class FakeAIClient:
    def __init__(self, result: AIConnectivityResult | None = None, error: Exception | None = None):
        self._result = result
        self._error = error

    async def test_connectivity(self, prompt: str) -> AIConnectivityResult:
        if self._error is not None:
            raise self._error
        assert self._result is not None
        return self._result


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
                result=AIConnectivityResult(model="gpt-5.3-chat", output_text="4")
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
