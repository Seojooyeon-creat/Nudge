"""Singleton Supabase client used by the API for database access.

Uses the service_role key so the backend can read/write on behalf of users
after it has verified their JWT. Never expose this key to the frontend.
"""
from functools import lru_cache

from supabase import Client, create_client

from core.config import settings


@lru_cache
def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_KEY in backend/.env"
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)
