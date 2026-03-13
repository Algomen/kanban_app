from typing import Literal

from pydantic import BaseModel, Field, model_validator


class CardModel(BaseModel):
    id: str
    title: str
    details: str


class ColumnModel(BaseModel):
    id: str
    title: str
    cardIds: list[str] = Field(default_factory=list)


class BoardModel(BaseModel):
    columns: list[ColumnModel]
    cards: dict[str, CardModel]

    @model_validator(mode="after")
    def validate_card_references(self) -> "BoardModel":
        seen_card_ids: set[str] = set()

        for column in self.columns:
            for card_id in column.cardIds:
                if card_id not in self.cards:
                    raise ValueError(f"Column references unknown card id '{card_id}'.")
                if card_id in seen_card_ids:
                    raise ValueError(f"Card id '{card_id}' appears in more than one column.")
                seen_card_ids.add(card_id)

        return self


class AIConnectivityRequest(BaseModel):
    prompt: str = Field(default="What is 2+2? Reply with digits only.")


class AIConnectivityResponse(BaseModel):
    model: str
    output_text: str


class AIChatMessageModel(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AIChatRequest(BaseModel):
    board: BoardModel
    message: str = Field(max_length=2000)
    history: list[AIChatMessageModel] = Field(default_factory=list)


class AIChatResponse(BaseModel):
    assistantMessage: str
    board: BoardModel | None = None
