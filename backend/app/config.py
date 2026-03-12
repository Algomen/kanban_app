import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
DOTENV_PATH = REPO_ROOT / ".env"


class ConfigurationError(ValueError):
    pass


@dataclass(frozen=True)
class FoundrySettings:
    endpoint: str
    api_key: str
    model: str

    @classmethod
    def from_env(cls) -> "FoundrySettings":
        load_dotenv(DOTENV_PATH)

        endpoint = os.getenv("AI_FOUNDRY_ENDPOINT", "").strip()
        api_key = os.getenv("AI_FOUNDRY_KEY", "").strip()
        model = os.getenv("AI_FOUNDRY_MODEL", "").strip()

        missing = [
            name
            for name, value in (
                ("AI_FOUNDRY_ENDPOINT", endpoint),
                ("AI_FOUNDRY_KEY", api_key),
                ("AI_FOUNDRY_MODEL", model),
            )
            if not value
        ]
        if missing:
            joined_names = ", ".join(missing)
            raise ConfigurationError(f"Missing required AI configuration: {joined_names}.")

        return cls(endpoint=endpoint, api_key=api_key, model=model)
