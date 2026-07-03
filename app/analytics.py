import csv
import io
import json
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, Request, Response

from app.config import settings
from app.db import get_connection, init_db

SESSION_COOKIE = "base212_sid"


def setup_analytics() -> None:
    init_db()


def is_admin_email(email: str | None) -> bool:
    if not email:
        return False
    return email.strip().lower() in settings.admin_email_list


def require_admin(request: Request) -> dict:
    from app.auth import get_current_user

    user = get_current_user(request)
    if not user or not is_admin_email(user.get("email")):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def get_session_id(request: Request) -> str:
    session_id = request.cookies.get(SESSION_COOKIE)
    if session_id:
        return session_id
    return str(uuid.uuid4())


def attach_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_id,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
        path="/",
    )


def upsert_user(
    user_sub: str,
    user_email: str | None,
    user_name: str | None = None,
    user_picture: str | None = None,
) -> None:
    now = datetime.now(UTC)
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO users (user_sub, email, name, picture, first_login_at, last_login_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_sub) DO UPDATE SET
                email = COALESCE(EXCLUDED.email, users.email),
                name = COALESCE(EXCLUDED.name, users.name),
                picture = COALESCE(EXCLUDED.picture, users.picture),
                last_login_at = EXCLUDED.last_login_at
            """,
            (user_sub, user_email, user_name, user_picture, now, now),
        )
        conn.commit()


def touch_session(
    session_id: str,
    user_sub: str | None = None,
    user_email: str | None = None,
) -> None:
    now = datetime.now(UTC)
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM sessions WHERE id = %s",
            (session_id,),
        ).fetchone()
        if existing:
            conn.execute(
                """
                UPDATE sessions
                SET last_seen_at = %s,
                    user_sub = COALESCE(%s, user_sub),
                    user_email = COALESCE(%s, user_email)
                WHERE id = %s
                """,
                (now, user_sub, user_email, session_id),
            )
        else:
            conn.execute(
                """
                INSERT INTO sessions (id, user_sub, user_email, started_at, last_seen_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (session_id, user_sub, user_email, now, now),
            )
        conn.commit()


def record_login(
    user_sub: str,
    user_email: str | None,
    user_name: str | None = None,
    user_picture: str | None = None,
) -> None:
    now = datetime.now(UTC)
    upsert_user(user_sub, user_email, user_name, user_picture)
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO login_events (user_sub, user_email, user_name, user_picture, logged_in_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_sub, user_email, user_name, user_picture, now),
        )
        conn.commit()


def record_visit(
    session_id: str,
    user_sub: str | None = None,
    user_email: str | None = None,
) -> None:
    touch_session(session_id, user_sub, user_email)


def record_query(
    session_id: str,
    role_ids: list[str],
    user_sub: str | None = None,
    user_email: str | None = None,
) -> None:
    now = datetime.now(UTC)
    touch_session(session_id, user_sub, user_email)
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO queries (session_id, user_sub, user_email, role_ids, executed_at)
            VALUES (%s, %s, %s, %s::jsonb, %s)
            """,
            (session_id, user_sub, user_email, json.dumps(role_ids), now),
        )
        conn.commit()


def get_admin_stats() -> dict:
    with get_connection() as conn:
        total_sessions = conn.execute("SELECT COUNT(*) AS c FROM sessions").fetchone()["c"]
        visits_without_message = conn.execute(
            """
            SELECT COUNT(*) AS c
            FROM sessions s
            WHERE NOT EXISTS (
                SELECT 1 FROM queries q WHERE q.session_id = s.id
            )
            """
        ).fetchone()["c"]
        total_queries = conn.execute("SELECT COUNT(*) AS c FROM queries").fetchone()["c"]
        total_users = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        logins_by_date = conn.execute(
            """
            SELECT logged_in_at::date AS date, COUNT(*) AS count
            FROM login_events
            GROUP BY logged_in_at::date
            ORDER BY date DESC
            LIMIT 30
            """
        ).fetchall()
        queries_by_date = conn.execute(
            """
            SELECT executed_at::date AS date, COUNT(*) AS count
            FROM queries
            GROUP BY executed_at::date
            ORDER BY date DESC
            LIMIT 30
            """
        ).fetchall()
        sessions_by_date = conn.execute(
            """
            SELECT started_at::date AS date, COUNT(*) AS count
            FROM sessions
            GROUP BY started_at::date
            ORDER BY date DESC
            LIMIT 30
            """
        ).fetchall()
        visits_without_message_by_date = conn.execute(
            """
            SELECT s.started_at::date AS date, COUNT(*) AS count
            FROM sessions s
            WHERE NOT EXISTS (
                SELECT 1 FROM queries q WHERE q.session_id = s.id
            )
            GROUP BY s.started_at::date
            ORDER BY date DESC
            LIMIT 30
            """
        ).fetchall()

    return {
        "total_sessions": total_sessions,
        "visits_without_message": visits_without_message,
        "total_queries": total_queries,
        "total_users": total_users,
        "logins_by_date": [
            {"date": row["date"].isoformat(), "count": row["count"]} for row in logins_by_date
        ],
        "queries_by_date": [
            {"date": row["date"].isoformat(), "count": row["count"]} for row in queries_by_date
        ],
        "sessions_by_date": [
            {"date": row["date"].isoformat(), "count": row["count"]} for row in sessions_by_date
        ],
        "visits_without_message_by_date": [
            {"date": row["date"].isoformat(), "count": row["count"]}
            for row in visits_without_message_by_date
        ],
    }


def get_users_csv() -> str:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                u.name,
                u.email,
                u.user_sub,
                u.picture,
                u.first_login_at,
                u.last_login_at,
                COUNT(le.id) AS total_logins
            FROM users u
            LEFT JOIN login_events le ON le.user_sub = u.user_sub
            GROUP BY u.user_sub, u.name, u.email, u.picture, u.first_login_at, u.last_login_at
            ORDER BY u.last_login_at DESC
            """
        ).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "name",
        "email",
        "user_sub",
        "picture",
        "first_login_at",
        "last_login_at",
        "total_logins",
    ])
    for row in rows:
        writer.writerow([
            row["name"] or "",
            row["email"] or "",
            row["user_sub"],
            row["picture"] or "",
            row["first_login_at"].isoformat() if row["first_login_at"] else "",
            row["last_login_at"].isoformat() if row["last_login_at"] else "",
            row["total_logins"],
        ])
    return output.getvalue()
