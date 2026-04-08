from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, request

from backend.utils.http import error


def create_access_token(user_id: str, barbearia_id: str, role: str, extra_claims: dict | None = None):
    exp = datetime.now(tz=timezone.utc) + timedelta(
        minutes=current_app.config["JWT_EXPIRES_MINUTES"]
    )
    payload = {
        "user_id": user_id,
        "barbearia_id": barbearia_id,
        "role": role,
        "scope": "TENANT",
        "exp": exp,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def create_master_access_token(user_id: str = "master"):
    exp = datetime.now(tz=timezone.utc) + timedelta(
        minutes=current_app.config["JWT_EXPIRES_MINUTES"]
    )
    payload = {
        "user_id": user_id,
        "barbearia_id": "master",
        "role": "MASTER",
        "scope": "MASTER",
        "exp": exp,
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            return current_app.make_default_options_response()

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return error("Token ausente", 401)

        token = auth_header.replace("Bearer ", "", 1).strip()
        if not token:
            return error("Token inválido", 401)

        try:
            payload = jwt.decode(
                token, current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )
        except jwt.InvalidTokenError:
            return error("Token inválido", 401)

        if str(payload.get("scope", "TENANT")).upper() == "MASTER":
            return error("Escopo de token inválido para esta rota", 403)

        if str(payload.get("barbearia_id")) != str(getattr(g, "barbearia_id", "")):
            return error("Tenant inválido", 403)

        g.user_id = str(payload.get("user_id"))
        g.user_role = str(payload.get("role"))
        g.token_payload = payload
        return fn(*args, **kwargs)

    return wrapper


def master_auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            return current_app.make_default_options_response()

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return error("Token ausente", 401)

        token = auth_header.replace("Bearer ", "", 1).strip()
        if not token:
            return error("Token inválido", 401)

        try:
            payload = jwt.decode(
                token, current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )
        except jwt.InvalidTokenError:
            return error("Token inválido", 401)

        scope = str(payload.get("scope", "")).upper()
        role = str(payload.get("role", "")).upper()
        if scope != "MASTER" or role != "MASTER":
            return error("Acesso negado", 403)

        g.user_id = str(payload.get("user_id"))
        g.user_role = role
        g.token_payload = payload
        return fn(*args, **kwargs)

    return wrapper
