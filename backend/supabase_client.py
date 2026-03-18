import os
from flask import current_app
from supabase import Client, ClientOptions, create_client

_client: Client | None = None


def reset_supabase_client():
    global _client
    _client = None

def is_supabase_ready() -> bool:
    return bool(current_app.config.get("SUPABASE_URL") and current_app.config.get("SUPABASE_KEY"))

def get_supabase_client() -> Client:
    global _client
    url = current_app.config.get("SUPABASE_URL", "")
    key = current_app.config.get("SUPABASE_KEY", "")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL/SUPABASE_KEY não configurados")
    if _client is None:
        timeout_seconds = int(current_app.config.get("SUPABASE_HTTP_TIMEOUT_SECONDS", 8) or 8)
        options = ClientOptions(postgrest_client_timeout=timeout_seconds)
        _client = create_client(url, key, options)
    return _client
