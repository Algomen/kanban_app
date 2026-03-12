from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def test_index_serves_placeholder_html_without_frontend_export() -> None:
    client = TestClient(create_app(frontend_dir=Path("/tmp/does-not-exist")))
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Backend scaffold is running." in response.text


def test_hello_endpoint() -> None:
    client = TestClient(create_app(frontend_dir=Path("/tmp/does-not-exist")))
    response = client.get("/api/hello")

    assert response.status_code == 200
    assert response.json() == {"message": "hello from fastapi"}


def test_index_serves_static_frontend_when_export_exists(tmp_path: Path) -> None:
    (tmp_path / "index.html").write_text(
        "<!doctype html><html><body><h1>Kanban Studio</h1></body></html>",
        encoding="utf-8",
    )
    client = TestClient(create_app(frontend_dir=tmp_path))

    response = client.get("/")

    assert response.status_code == 200
    assert "Kanban Studio" in response.text
