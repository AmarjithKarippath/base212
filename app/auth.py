from datetime import UTC, datetime, timedelta

import jwt
from authlib.integrations.starlette_client import OAuth
from fastapi import HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from app.config import settings
from app.analytics import record_login

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

SESSION_COOKIE = "base212_session"


def resolve_public_base_url(request: Request) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto")
    scheme = (
        forwarded_proto.split(",")[0].strip()
        if forwarded_proto
        else request.url.scheme
    )
    host = request.headers.get("host") or request.url.netloc
    return f"{scheme}://{host}"


def resolve_google_redirect_uri(request: Request) -> str:
    if request.headers.get("host"):
        return f"{resolve_public_base_url(request)}/api/auth/google/callback"
    return settings.google_redirect_uri


def _encode_session(user: dict) -> str:
    payload = {
        "sub": user["sub"],
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "exp": datetime.now(UTC) + timedelta(days=7),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_session(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None


def get_current_user(request: Request) -> dict | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    return decode_session(token)


def set_session_cookie(response: Response, user: dict) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=_encode_session(user),
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=SESSION_COOKIE, path="/")


async def start_google_login(request: Request, popup: bool = False) -> RedirectResponse:
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=503, detail="Google login is not configured")

    state = "popup" if popup else "redirect"
    redirect_uri = resolve_google_redirect_uri(request)
    return await oauth.google.authorize_redirect(
        request,
        redirect_uri,
        state=state,
    )


async def finish_google_login(request: Request) -> RedirectResponse:
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=503, detail="Google login is not configured")

    try:
        redirect_uri = resolve_google_redirect_uri(request)
        token = await oauth.google.authorize_access_token(
            request,
            redirect_uri=redirect_uri,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Google login failed") from exc

    user_info = token.get("userinfo")
    if not user_info:
        raise HTTPException(status_code=400, detail="Google login failed")

    state = request.query_params.get("state", "redirect")
    popup = state == "popup"
    frontend_url = resolve_public_base_url(request)
    redirect_url = (
        f"{frontend_url}/auth/callback.html"
        if popup
        else frontend_url
    )

    response = RedirectResponse(url=redirect_url, status_code=302)
    user_payload = {
        "sub": user_info["sub"],
        "email": user_info.get("email"),
        "name": user_info.get("name"),
        "picture": user_info.get("picture"),
    }
    set_session_cookie(response, user_payload)
    record_login(
        user_payload["sub"],
        user_payload.get("email"),
        user_payload.get("name"),
        user_payload.get("picture"),
    )
    return response
