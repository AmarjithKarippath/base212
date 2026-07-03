from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config import settings
from app.novita import create_chat, create_chat_completion, iter_stream_chunks
from app.roles import format_role_system_prompt, get_role_catalog
from app.schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatRequest,
    ChatResponse,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not settings.novita_api_key.strip():
        raise RuntimeError("NOVITA_API_KEY is required")
    yield


app = FastAPI(
    title="base212 API",
    description="base212 AI team chat backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/roles")
async def list_roles():
    return get_role_catalog().model_dump()


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    model = request.model or settings.default_model

    try:
        system_prompt, selected_roles = format_role_system_prompt(request.role_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        completion = await create_chat(request, system_prompt)
        choice = completion.choices[0]
        usage = None
        if completion.usage is not None:
            usage = completion.usage.model_dump(exclude_none=True)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return ChatResponse(
        reply=choice.message.content or "",
        model=model,
        selected_roles=selected_roles,
        finish_reason=choice.finish_reason,
        usage=usage,
    )


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    model = request.model or settings.default_model

    if request.stream:
        try:
            completion = await create_chat_completion(request)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        async def event_stream():
            async for chunk in iter_stream_chunks(completion):
                yield chunk

        return StreamingResponse(event_stream(), media_type="text/plain")

    try:
        completion = await create_chat_completion(request)
        content = completion.choices[0].message.content or ""
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return ChatCompletionResponse(content=content, model=model)
