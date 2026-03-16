import os
from pathlib import Path
from urllib.parse import urlparse

from flask import Flask
from flask_cors import CORS
from flask import request
from werkzeug.exceptions import HTTPException
from dotenv import load_dotenv

from backend.config import get_config
from backend.db import init_db, is_db_ready
from backend.middleware.tenant import resolve_tenant
from backend.routes import register_routes
from backend.supabase_client import is_supabase_ready
from backend.utils.http import error, success


def _append_no_proxy_hosts(*hosts: str):
    current_no_proxy = os.getenv("NO_PROXY") or os.getenv("no_proxy") or ""
    normalized = [item.strip() for item in current_no_proxy.split(",") if item.strip()]
    seen = {item.lower() for item in normalized}

    for host in hosts:
        clean_host = str(host or "").strip()
        if not clean_host:
            continue
        lowered = clean_host.lower()
        if lowered in seen:
            continue
        normalized.append(clean_host)
        seen.add(lowered)

    merged = ",".join(normalized)
    os.environ["NO_PROXY"] = merged
    os.environ["no_proxy"] = merged


def _clear_system_proxy_env():
    for key in (
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    ):
        os.environ.pop(key, None)


def _normalize_runtime_network(config):
    _append_no_proxy_hosts("localhost", "127.0.0.1", "::1", "wsl.localhost")

    if not config.get("BYPASS_PROXY_FOR_SUPABASE"):
        return

    supabase_url = str(config.get("SUPABASE_URL") or "").strip()
    if not supabase_url:
        return

    parsed = urlparse(supabase_url)
    host = (parsed.hostname or "").strip()
    if host:
        _append_no_proxy_hosts(host)

    if config.get("DISABLE_SYSTEM_PROXY_FOR_SUPABASE"):
        _clear_system_proxy_env()


def create_app():
    load_dotenv(Path(__file__).with_name(".env"), override=True)

    app = Flask(__name__)
    app.config.from_object(get_config())
    _normalize_runtime_network(app.config)
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins}},
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Barbearia-Slug"],
    )

    @app.after_request
    def ensure_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Barbearia-Slug"
        return response

    @app.route("/", methods=["OPTIONS"])
    @app.route("/<path:_path>", methods=["OPTIONS"])
    def options_preflight(_path=""):
        return ("", 204)

    init_db("")

    @app.before_request
    def tenant_guard():
        if request.method == "OPTIONS":
            return None

        db_ok = is_db_ready()
        supabase_ok = is_supabase_ready()
        if not db_ok and not supabase_ok:
            if request.path.startswith("/health"):
                return None
            return error("Banco não configurado (DATABASE_URL ou SUPABASE)", 503)
        return resolve_tenant()

    @app.get("/health")
    def health():
        return success({"status": "ok"})

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc):
        if isinstance(exc, HTTPException):
            return error(exc.description or "Erro HTTP", exc.code or 500)

        if app.config.get("DEBUG"):
            return error(f"Erro interno da API: {exc}", 500)

        return error("Erro interno da API. Tente novamente em instantes.", 500)

    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
