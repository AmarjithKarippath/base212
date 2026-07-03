from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.middleware.sessions import SessionMiddleware

from app.auth import (
    clear_session_cookie,
    finish_google_login,
    get_current_user,
    start_google_login,
)
from app.config import settings
from app.novita import create_chat, create_chat_completion, iter_stream_chunks
from app.roles import format_role_system_prompt, get_role_catalog
from app.schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatRequest,
    ChatResponse,
)
from app.schemas_auth import UserProfile


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
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/roles")
async def list_roles():
    return get_role_catalog().model_dump()


@app.get("/auth/me")
async def auth_me(request: Request) -> UserProfile | None:
    user = get_current_user(request)
    if not user:
        return None
    return UserProfile.model_validate(user)


@app.get("/auth/google/login")
async def auth_google_login(request: Request, popup: bool = False):
    return await start_google_login(request, popup=popup)


@app.get("/auth/google/callback")
async def auth_google_callback(request: Request):
    return await finish_google_login(request)


@app.post("/auth/logout")
async def auth_logout() -> JSONResponse:
    response = JSONResponse({"ok": True})
    clear_session_cookie(response)
    return response


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
