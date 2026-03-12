from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from app.config import FoundrySettings


class AIClientError(RuntimeError):
    pass


@dataclass(frozen=True)
class AIConnectivityResult:
    model: str
    output_text: str


class AIClient(Protocol):
    async def test_connectivity(self, prompt: str) -> AIConnectivityResult: ...


class FoundryClient:
    def __init__(
        self,
        settings: FoundrySettings,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._http_client = http_client

    async def test_connectivity(self, prompt: str) -> AIConnectivityResult:
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
        output_text = _extract_output_text(response_body)

        if not output_text:
            raise AIClientError("AI Foundry response did not include output text.")

        return AIConnectivityResult(model=self._settings.model, output_text=output_text)


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
