import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


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
