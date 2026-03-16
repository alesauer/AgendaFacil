import time

from flask import current_app, g, request

from backend.db import is_db_ready, query_one
from backend.utils.http import error


def _is_connection_refused(exc: Exception) -> bool:
    message = str(exc).lower()
    return "connection refused" in message or "errno 111" in message or "erro ao conectar" in message


def _extract_slug_from_host(host: str):
    host_no_port = host.split(":")[0].strip().lower()
    if not host_no_port:
        return None
    if host_no_port in {"localhost", "127.0.0.1"}:
        return None
    parts = host_no_port.split(".")
    if len(parts) < 3:
        return None
    return parts[0]


def resolve_tenant():
    if request.method == "OPTIONS":
        return None

    if request.path.startswith("/health"):
        return None

    slug = _extract_slug_from_host(request.host or "")

    if not slug:
        slug = request.headers.get("X-Barbearia-Slug") or current_app.config.get(
            "DEFAULT_BARBEARIA_SLUG", ""
        )

    if not slug:
        return error("Tenant não informado", 400)

    row = None
    if is_db_ready():
        try:
            row = query_one("SELECT id, slug FROM barbearias WHERE slug = %s", (slug,))
        except Exception:
            row = None

    if row is None:
        module = __import__("backend.supabase_client", fromlist=["get_supabase_client", "is_supabase_ready"])
        get_supabase_client = getattr(module, "get_supabase_client")
        is_supabase_ready = getattr(module, "is_supabase_ready")

    if row is None and is_supabase_ready():
        retries = int(current_app.config.get("SUPABASE_TENANT_RETRIES", 3) or 3)
        retries = max(1, retries)
        last_exc = None

        for attempt in range(retries):
            try:
                supabase = get_supabase_client()
                response = (
                    supabase.table("barbearias")
                    .select("id,slug")
                    .eq("slug", slug)
                    .limit(1)
                    .execute()
                )
                data = response.data or []
                row = data[0] if data else None
                last_exc = None
                break
            except Exception as exc:
                last_exc = exc
                if attempt < retries - 1:
                    time.sleep(0.4 * (attempt + 1))

        if last_exc is not None and row is None:
            exc = last_exc
            if str(current_app.config.get("APP_ENV", "")).lower() == "development":
                if _is_connection_refused(exc):
                    return error(
                        "Banco de dados indisponível: conexão recusada ao Supabase. "
                        "Verifique rede/proxy e mantenha BYPASS_PROXY_FOR_SUPABASE=true "
                        "(e DISABLE_SYSTEM_PROXY_FOR_SUPABASE=true).",
                        503,
                    )
                return error(f"Banco de dados indisponível: {exc}", 503)
            return error("Banco de dados indisponível", 503)

    if not row:
        return error("Barbearia não encontrada", 404)

    g.barbearia_id = str(row["id"])
    g.barbearia_slug = row["slug"]
    return None
