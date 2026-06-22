"""Application configuration loaded from environment variables."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""  # service_role key (server-side only, never ship to client)
    supabase_jwt_secret: str = ""   # used to verify Supabase Auth JWTs

    # App
    app_name: str = "Nudge API"
    debug: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
