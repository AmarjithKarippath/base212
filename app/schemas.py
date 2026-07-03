from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatCompletionRequest(BaseModel):
    messages: list[ChatMessage]
    model: str | None = None
    stream: bool = False
    max_tokens: int = Field(default=16384, ge=1)
    temperature: float = Field(default=1.0, ge=0.0, le=2.0)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    min_p: float = Field(default=0.0, ge=0.0, le=1.0)
    top_k: int = Field(default=50, ge=0)
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    repetition_penalty: float = Field(default=1.0, ge=0.0)
    response_format: dict[str, str] = Field(default_factory=lambda: {"type": "text"})


class ChatCompletionResponse(BaseModel):
    content: str
    model: str


class SelectedRole(BaseModel):
    id: str
    name: str
    category: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    role_ids: list[str] = Field(min_length=1)
    model: str | None = None
    max_tokens: int = Field(default=16384, ge=1)
    temperature: float = Field(default=1.0, ge=0.0, le=2.0)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    min_p: float = Field(default=0.0, ge=0.0, le=1.0)
    top_k: int = Field(default=50, ge=0)
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    repetition_penalty: float = Field(default=1.0, ge=0.0)


class ChatResponse(BaseModel):
    reply: str
    model: str
    selected_roles: list[SelectedRole]
    finish_reason: str | None = None
    usage: dict[str, int] | None = None
