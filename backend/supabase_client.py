from flask import current_app
from supabase import Client, create_client


_client: Client | None = None


def is_supabase_ready() -> bool:
    return bool(current_app.config.get("SUPABASE_URL") and current_app.config.get("SUPABASE_KEY"))


def get_supabase_client() -> Client:
    global _client
    url = current_app.config.get("SUPABASE_URL", "")
    key = current_app.config.get("SUPABASE_KEY", "")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL/SUPABASE_KEY não configurados")
    if _client is None:
        _client = create_client(url, key)
    return _client
