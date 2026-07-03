from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    novita_api_key: str = ""
    novita_base_url: str = "https://api.novita.ai/openai"
    default_model: str = "openai/gpt-oss-120b"
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:3009,http://127.0.0.1:3009,"
        "https://www.base212.com,https://base212.com"
    )
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:3009/api/auth/google/callback"
    jwt_secret: str = "change-me-in-production"
    frontend_url: str = "http://localhost:3009"
    session_cookie_secure: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
