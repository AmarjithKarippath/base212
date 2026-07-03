from pydantic import BaseModel


class UserProfile(BaseModel):
    sub: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None
