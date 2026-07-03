from pydantic import BaseModel


class DailyCount(BaseModel):
    date: str
    count: int


class AdminStats(BaseModel):
    total_sessions: int
    visits_without_message: int
    total_queries: int
    total_users: int
    logins_by_date: list[DailyCount]
    queries_by_date: list[DailyCount]
    sessions_by_date: list[DailyCount]
    visits_without_message_by_date: list[DailyCount]
