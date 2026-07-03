from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from starlette.middleware.sessions import SessionMiddleware

from app.analytics import (
    attach_session_cookie,
    get_admin_stats,
    get_session_id,
    get_users_csv,
    is_admin_email,
    record_query,
    record_visit,
    require_admin,
    setup_analytics,
)
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
from app.schemas_admin import AdminStats
from app.schemas_auth import UserProfile


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not settings.novita_api_key.strip():
        raise RuntimeError("NOVITA_API_KEY is required")
    setup_analytics()
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
    return UserProfile.model_validate(
        {
            **user,
            "is_admin": is_admin_email(user.get("email")),
        }
    )


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


@app.post("/analytics/visit")
async def analytics_visit(req: Request):
    user = get_current_user(req)
    session_id = get_session_id(req)
    record_visit(
        session_id,
        user.get("sub") if user else None,
        user.get("email") if user else None,
    )
    response = JSONResponse({"ok": True})
    attach_session_cookie(response, session_id)
    return response


@app.get("/admin/stats", response_model=AdminStats)
async def admin_stats(_: dict = Depends(require_admin)) -> AdminStats:
    return AdminStats.model_validate(get_admin_stats())


@app.get("/admin/users/export")
async def admin_users_export(_: dict = Depends(require_admin)):
    csv_content = get_users_csv()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="base212-users.csv"'},
    )


@app.post("/chat")
async def chat(request: ChatRequest, req: Request):
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

    user = get_current_user(req)
    session_id = get_session_id(req)
    record_query(
        session_id,
        request.role_ids,
        user.get("sub") if user else None,
        user.get("email") if user else None,
    )

    result = ChatResponse(
        reply=choice.message.content or "",
        model=model,
        selected_roles=selected_roles,
        finish_reason=choice.finish_reason,
        usage=usage,
    )
    response = JSONResponse(content=result.model_dump())
    attach_session_cookie(response, session_id)
    return response


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
