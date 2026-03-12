from flask import Flask
from flask_cors import CORS
from flask import request

from backend.config import get_config
from backend.db import init_db, is_db_ready
from backend.middleware.tenant import resolve_tenant
from backend.routes import register_routes
from backend.supabase_client import is_supabase_ready
from backend.utils.http import error, success


def create_app():
    app = Flask(__name__)
    app.config.from_object(get_config())
    CORS(app)

    if app.config.get("SUPABASE_ONLY"):
        init_db("")
    else:
        init_db(app.config["DATABASE_URL"])

    @app.before_request
    def tenant_guard():
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

    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
