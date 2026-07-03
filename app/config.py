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
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3009,http://127.0.0.1:3009"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
