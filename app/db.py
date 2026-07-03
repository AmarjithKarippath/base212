import time

import psycopg
from psycopg.rows import dict_row

from app.config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_sub TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    picture TEXT,
    first_login_at TIMESTAMPTZ NOT NULL,
    last_login_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_sub TEXT REFERENCES users(user_sub),
    user_email TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS queries (
    id SERIAL PRIMARY KEY,
    session_id TEXT,
    user_sub TEXT,
    user_email TEXT,
    role_ids JSONB NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS login_events (
    id SERIAL PRIMARY KEY,
    user_sub TEXT NOT NULL,
    user_email TEXT,
    user_name TEXT,
    user_picture TEXT,
    logged_in_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_queries_executed_at ON queries(executed_at);
CREATE INDEX IF NOT EXISTS idx_login_events_logged_in_at ON login_events(logged_in_at);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);
"""


def get_connection() -> psycopg.Connection:
    return psycopg.connect(settings.database_url, row_factory=dict_row)


def init_db(max_retries: int = 20, retry_delay: float = 1.0) -> None:
    last_error: Exception | None = None
    for _ in range(max_retries):
        try:
            with get_connection() as conn:
                for statement in SCHEMA.strip().split(";"):
                    stmt = statement.strip()
                    if stmt:
                        conn.execute(stmt)
                conn.commit()
            return
        except psycopg.OperationalError as exc:
            last_error = exc
            time.sleep(retry_delay)
    raise RuntimeError("Could not connect to PostgreSQL") from last_error
