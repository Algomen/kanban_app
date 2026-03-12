import json
from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from app.config import FoundrySettings
from app.schemas import AIChatMessageModel, AIChatResponse, BoardModel


class AIClientError(RuntimeError):
    pass


@dataclass(frozen=True)
class AIConnectivityResult:
    model: str
    output_text: str


@dataclass(frozen=True)
class AIBoardResult:
    model: str
    assistant_message: str
    board: dict[str, Any] | None


class AIClient(Protocol):
    async def test_connectivity(self, prompt: str) -> AIConnectivityResult: ...
    async def respond_about_board(
        self,
        board: dict[str, Any],
        message: str,
        history: list[AIChatMessageModel],
    ) -> AIBoardResult: ...


class FoundryClient:
    def __init__(
        self,
        settings: FoundrySettings,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._http_client = http_client

    async def test_connectivity(self, prompt: str) -> AIConnectivityResult:
        output_text = await self._send_prompt(prompt)

        if not output_text:
            raise AIClientError("AI Foundry response did not include output text.")

        return AIConnectivityResult(model=self._settings.model, output_text=output_text)

    async def respond_about_board(
        self,
        board: dict[str, Any],
        message: str,
        history: list[AIChatMessageModel],
    ) -> AIBoardResult:
        prompt = _build_board_prompt(board=board, message=message, history=history)
        output_text = await self._send_prompt(prompt)

        if not output_text:
            raise AIClientError("AI Foundry response did not include output text.")

        return _parse_board_response(self._settings.model, output_text)

    async def _send_prompt(self, prompt: str) -> str:
        payload = {
            "model": self._settings.model,
            "input": prompt,
        }
        headers = {
            "api-key": self._settings.api_key,
            "content-type": "application/json",
        }

        if self._http_client is not None:
            response = await self._http_client.post(
                self._settings.endpoint,
                json=payload,
                headers=headers,
            )
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self._settings.endpoint,
                    json=payload,
                    headers=headers,
                )

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise AIClientError("AI Foundry request failed.") from exc

        response_body = response.json()
        return _extract_output_text(response_body)


def _extract_output_text(response_body: dict[str, Any]) -> str:
    output_text = response_body.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    outputs = response_body.get("output")
    if not isinstance(outputs, list):
        return ""

    collected_text: list[str] = []
    for item in outputs:
        if not isinstance(item, dict):
            continue
        content_items = item.get("content")
        if not isinstance(content_items, list):
            continue
        for content_item in content_items:
            if not isinstance(content_item, dict):
                continue
            if content_item.get("type") == "output_text":
                text = content_item.get("text")
                if isinstance(text, str) and text.strip():
                    collected_text.append(text.strip())

    return "\n".join(collected_text)


def _build_board_prompt(
    board: dict[str, Any],
    message: str,
    history: list[AIChatMessageModel],
) -> str:
    history_payload = [
        {"role": entry.role, "content": entry.content}
        for entry in history
    ]

    instructions = {
        "task": "You are assisting with a project management kanban board.",
        "rules": [
            "Return exactly one JSON object and no markdown.",
            "The JSON must match this shape: {\"assistantMessage\": string, \"board\": BoardData | null}.",
            "Use board as null if no board changes are needed.",
            "If you change the board, return the full updated board.",
            "Preserve existing ids for unchanged columns and cards.",
            "Do not invent columns beyond the fixed existing columns.",
            "Ensure every card id appears in exactly one column.",
        ],
    }

    prompt_payload = {
        "instructions": instructions,
        "history": history_payload,
        "board": board,
        "userMessage": message,
    }

    return json.dumps(prompt_payload, separators=(",", ":"))


def _parse_board_response(model: str, output_text: str) -> AIBoardResult:
    try:
        payload = json.loads(output_text)
    except json.JSONDecodeError as exc:
        raise AIClientError("AI response was not valid JSON.") from exc

    try:
        parsed_response = AIChatResponse.model_validate(payload)
    except Exception as exc:
        raise AIClientError("AI response did not match the expected schema.") from exc

    normalized_board: dict[str, Any] | None = None
    if parsed_response.board is not None:
        normalized_board = BoardModel.model_validate(
            parsed_response.board.model_dump()
        ).model_dump()

    return AIBoardResult(
        model=model,
        assistant_message=parsed_response.assistantMessage,
        board=normalized_board,
    )
