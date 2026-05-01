import hmac
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from uuid import uuid4

import jwt
from flask import Blueprint, current_app, g, redirect, request
from psycopg.errors import UniqueViolation
from werkzeug.security import check_password_hash, generate_password_hash
from uuid import UUID

from backend.middleware.auth import auth_required, create_access_token, create_master_access_token, master_auth_required
from backend.notifications.dispatcher import NotificationDispatcher
from backend.notifications.models import Channel, NotificationCommand
from backend.repositories.auth_repository import AuthRepository
from backend.repositories.barbearia_repository import BarbeariaRepository
from backend.utils.http import error, success

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _admin_guard():
    if str(getattr(g, "user_role", "")).upper() != "ADMIN":
        return error("Acesso negado", 403)
    return None


def _build_password_recovery_token(user_id: str, barbearia_id: str, frontend_origin: str | None = None) -> str:
    exp = datetime.now(tz=timezone.utc) + timedelta(minutes=30)
    payload = {
        "user_id": user_id,
        "barbearia_id": barbearia_id,
        "scope": "PASSWORD_RESET",
        "exp": exp,
    }
    safe_origin = str(frontend_origin or "").strip().rstrip("/")
    if safe_origin.startswith("http://") or safe_origin.startswith("https://"):
        payload["frontend_origin"] = safe_origin
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def _resolve_frontend_origin(decoded_token: dict | None = None) -> str:
    configured = str(current_app.config.get("FRONTEND_APP_URL") or "").strip().rstrip("/")
    if configured:
        return configured

    token_origin = str((decoded_token or {}).get("frontend_origin") or "").strip().rstrip("/")
    if token_origin.startswith("http://") or token_origin.startswith("https://"):
        return token_origin

    origin = str(request.headers.get("Origin") or "").strip().rstrip("/")
    if origin.startswith("http://") or origin.startswith("https://"):
        return origin

    return f"{request.scheme}://{request.host}".rstrip("/")


def _build_password_reset_link(token: str) -> str:
    api_origin = f"{request.scheme}://{request.host}".rstrip("/")
    return f"{api_origin}/auth/reset-password?token={quote(token)}"


def _build_frontend_reset_link(token: str, decoded_token: dict | None = None) -> str:
    frontend_origin = _resolve_frontend_origin(decoded_token)
    return f"{frontend_origin}/#/login?recovery_token={quote(token)}"


@auth_bp.post("/master/login")
def master_login():
        payload = request.get_json(silent=True) or {}
        login_value = str(payload.get("login") or payload.get("email") or payload.get("telefone") or "").strip()
        senha = str(payload.get("senha") or "")

        expected_login = str(current_app.config.get("MASTER_LOGIN") or "").strip()
        expected_password = str(current_app.config.get("MASTER_PASSWORD") or "")
        master_name = str(current_app.config.get("MASTER_NAME") or "Master SaaS")

        if not expected_login or not expected_password:
                return error("Credenciais MASTER não configuradas no servidor", 503)

        if not login_value or not senha:
                return error("login e senha são obrigatórios", 400)

        login_ok = hmac.compare_digest(login_value.lower(), expected_login.lower())
        password_ok = hmac.compare_digest(senha, expected_password)

        if not login_ok or not password_ok:
                return error("Credenciais inválidas", 401)

        token = create_master_access_token("master")
        user = {
            "id": "master",
            "barbearia_id": "master",
            "nome": master_name,
            "telefone": expected_login,
            "email": expected_login if "@" in expected_login else None,
            "role": "MASTER",
            "ativo": True,
        }
        return success({"token": token, "user": user})


@auth_bp.get("/master/me")
@master_auth_required
def master_me():
        expected_login = str(current_app.config.get("MASTER_LOGIN") or "").strip()
        master_name = str(current_app.config.get("MASTER_NAME") or "Master SaaS")
        return success(
                {
                        "id": "master",
                        "barbearia_id": "master",
                        "nome": master_name,
                        "telefone": expected_login,
                        "email": expected_login if "@" in expected_login else None,
                        "role": "MASTER",
                        "ativo": True,
                }
        )


@auth_bp.post("/signup")
def signup():
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    email_raw = payload.get("email")
    email = str(email_raw).strip().lower() if email_raw else None
    senha = payload.get("senha") or ""
    role = (payload.get("role") or "ADMIN").upper()

    if not nome or not telefone or not senha:
        return error("nome, telefone e senha são obrigatórios", 400)

    if role not in {"ADMIN", "EMPLOYEE", "CLIENT"}:
        return error("role inválido", 400)

    existing = AuthRepository.find_user_by_phone(g.barbearia_id, telefone)
    if existing:
        return error("Usuário já cadastrado", 409)

    if email:
        existing_email = AuthRepository.find_user_by_email(g.barbearia_id, email)
        if existing_email:
            return error("E-mail já cadastrado", 409)

    try:
        user = AuthRepository.create_user(
            g.barbearia_id,
            nome,
            telefone,
            generate_password_hash(senha),
            role,
            email,
        )
    except UniqueViolation:
        return error("Telefone já cadastrado nesta barbearia", 409)

    safe_user = {
        "id": user["id"],
        "barbearia_id": user["barbearia_id"],
        "nome": user["nome"],
        "telefone": user["telefone"],
        "email": user.get("email"),
        "role": user["role"],
        "ativo": user["ativo"],
    }

    token = create_access_token(str(user["id"]), str(user["barbearia_id"]), user["role"])
    return success({"token": token, "user": safe_user}, 201)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    telefone = (payload.get("telefone") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    login_value = str(payload.get("login") or "").strip()
    if login_value:
        if "@" in login_value:
            email = login_value.lower()
        else:
            telefone = login_value
    senha = payload.get("senha") or ""

    if (not telefone and not email) or not senha:
        return error("telefone ou email e senha são obrigatórios", 400)

    tenant = AuthRepository.find_tenant_by_id(g.barbearia_id)
    tenant_name = (tenant or {}).get("nome") or "sua barbearia"
    tenant_status = str((tenant or {}).get("assinatura_status") or "ACTIVE").upper()
    if tenant_status == "SUSPENDED":
        whatsapp_url = str(current_app.config.get("SUSPENSION_WHATSAPP_URL") or "").strip()
        portal_url = str(current_app.config.get("SUSPENSION_PORTAL_URL") or "").strip()
        billing_email = str(current_app.config.get("SUSPENSION_BILLING_EMAIL") or "").strip()
        return error(
            f"A barbearia {tenant_name} foi suspensa temporariamente.",
            423,
            code="TENANT_SUSPENDED",
            details={
                "tenant_name": tenant_name,
                "whatsapp_url": whatsapp_url or None,
                "portal_url": portal_url or None,
                "billing_email": billing_email or None,
            },
        )

    user = AuthRepository.find_user_by_email(g.barbearia_id, email) if email else AuthRepository.find_user_by_phone(g.barbearia_id, telefone)
    if not user or not check_password_hash(user["senha_hash"], senha):
        return error("Credenciais inválidas", 401)
    if not user.get("ativo", True):
        return error("Usuário inativo", 403)

    if str(user.get("role") or "").upper() == "ADMIN":
        BarbeariaRepository.start_trial_on_first_admin_login(g.barbearia_id)

    subscription = BarbeariaRepository.get_subscription(g.barbearia_id) or {}
    effective_status = str(subscription.get("assinatura_status_efetivo") or subscription.get("assinatura_status") or tenant_status).upper()
    if effective_status == "PAST_DUE":
        portal_url = str(current_app.config.get("SUSPENSION_PORTAL_URL") or "").strip()
        billing_email = str(current_app.config.get("SUSPENSION_BILLING_EMAIL") or "").strip()
        return error(
            f"O período de teste da barbearia {tenant_name} expirou. Regularize a assinatura para continuar.",
            423,
            code="TENANT_PAST_DUE",
            details={
                "tenant_name": tenant_name,
                "portal_url": portal_url or None,
                "billing_email": billing_email or None,
            },
        )

    token = create_access_token(str(user["id"]), str(user["barbearia_id"]), user["role"])
    safe_user = {
        "id": user["id"],
        "barbearia_id": user["barbearia_id"],
        "nome": user["nome"],
        "telefone": user["telefone"],
        "email": user.get("email"),
        "role": user["role"],
        "ativo": user["ativo"],
    }
    return success({"token": token, "user": safe_user})


@auth_bp.post("/forgot-password")
def forgot_password():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email") or "").strip().lower()

    if not email:
        return error("email é obrigatório", 400)

    if not EMAIL_REGEX.match(email):
        return error("email inválido", 400)

    user = AuthRepository.find_user_by_email(g.barbearia_id, email)
    if not user or str(user.get("role") or "").upper() != "ADMIN" or not bool(user.get("ativo", True)):
        return success(
            {
                "message": "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.",
            }
        )

    frontend_origin = str(request.headers.get("Origin") or "").strip()
    token = _build_password_recovery_token(str(user.get("id")), str(g.barbearia_id), frontend_origin)
    reset_link = _build_password_reset_link(token)
    tenant_name = str((AuthRepository.find_tenant_by_id(g.barbearia_id) or {}).get("nome") or "sua barbearia")
    user_name = str(user.get("nome") or "Administrador").strip() or "Administrador"

    text = (
        f"Olá, {user_name}.\n\n"
        f"Recebemos uma solicitação para redefinir a senha do acesso administrativo da barbearia {tenant_name}.\n"
        f"Para continuar, acesse o link abaixo (válido por 30 minutos):\n\n"
        f"{reset_link}\n\n"
        "Se você não solicitou a alteração, ignore este e-mail."
    )
    html = (
        f"<p>Olá, <strong>{user_name}</strong>.</p>"
        f"<p>Recebemos uma solicitação para redefinir a senha do acesso administrativo da barbearia <strong>{tenant_name}</strong>.</p>"
        "<p>Para continuar, clique no link abaixo (válido por 30 minutos):</p>"
        f"<p><a href=\"{reset_link}\">Redefinir minha senha</a></p>"
        "<p>Se você não solicitou a alteração, ignore este e-mail.</p>"
    )

    command = NotificationCommand(
        tenant_id=str(g.barbearia_id),
        channel=Channel.EMAIL,
        to=email,
        template_key="PASSWORD_RESET_REQUEST",
        variables={
            "subject": "Redefinição de senha - AgendaFácil",
            "text": text,
            "html": html,
        },
        idempotency_key=str(uuid4()),
        correlation_id=f"forgot-password:{user.get('id')}",
    )
    NotificationDispatcher().dispatch(command)

    return success(
        {
            "message": "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.",
        }
    )


@auth_bp.post("/reset-password")
def reset_password():
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token") or "").strip()
    new_password = str(payload.get("new_password") or "")

    if not token or not new_password:
        return error("token e new_password são obrigatórios", 400)

    if len(new_password) < 6:
        return error("A nova senha deve ter ao menos 6 caracteres", 400)

    try:
        decoded = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return error("Token de recuperação inválido ou expirado", 400)

    if str(decoded.get("scope") or "").upper() != "PASSWORD_RESET":
        return error("Token de recuperação inválido", 400)

    token_tenant = str(decoded.get("barbearia_id") or "")
    if token_tenant != str(g.barbearia_id):
        return error("Token de recuperação inválido para esta barbearia", 400)

    user_id = str(decoded.get("user_id") or "")
    user = AuthRepository.find_user_by_id(g.barbearia_id, user_id)
    if not user:
        return error("Usuário não encontrado", 404)

    if str(user.get("role") or "").upper() != "ADMIN":
        return error("Recuperação permitida apenas para administradores", 403)

    updated = AuthRepository.update_user(
        g.barbearia_id,
        user_id,
        str(user.get("nome") or "").strip(),
        str(user.get("telefone") or "").strip(),
        str(user.get("email") or "").strip().lower() or None,
        str(user.get("role") or "ADMIN").upper(),
        bool(user.get("ativo", True)),
        generate_password_hash(new_password),
    )
    if not updated:
        return error("Não foi possível atualizar a senha", 500)

    return success({"message": "Senha atualizada com sucesso"})


@auth_bp.get("/reset-password")
def reset_password_redirect():
    token = str(request.args.get("token") or "").strip()
    if not token:
        return error("token é obrigatório", 400)

    try:
        decoded = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        target = _build_frontend_reset_link(token, decoded)
    except jwt.InvalidTokenError:
        frontend_origin = _resolve_frontend_origin()
        target = f"{frontend_origin}/#/login?reset_error=invalid_token"

    return redirect(target, code=302)


@auth_bp.get("/me")
@auth_required
def me():
    user = AuthRepository.find_user_by_id(g.barbearia_id, g.user_id)
    if not user:
        return error("Usuário não encontrado", 404)
    return success(user)


@auth_bp.get("/users")
@auth_required
def list_users():
    denied = _admin_guard()
    if denied:
        return denied
    return success(AuthRepository.list_users(g.barbearia_id))


@auth_bp.post("/users")
@auth_required
def create_user_admin():
    denied = _admin_guard()
    if denied:
        return denied

    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    senha = payload.get("senha") or ""
    role = (payload.get("role") or "EMPLOYEE").upper()
    raw_user_id = payload.get("id")
    user_id = str(raw_user_id).strip() if raw_user_id is not None else None
    user_id = user_id or None

    if user_id:
        try:
            user_id = str(UUID(user_id))
        except (ValueError, TypeError):
            return error("id inválido: deve ser UUID", 400)

    if not nome or not telefone or not email or not senha:
        return error("nome, telefone, email e senha são obrigatórios", 400)

    if role not in {"ADMIN", "EMPLOYEE"}:
        return error("role inválido para usuário da equipe", 400)

    if user_id:
        existing_by_id = AuthRepository.find_user_by_id(g.barbearia_id, user_id)
        if existing_by_id:
            existing_phone = AuthRepository.find_user_by_phone(g.barbearia_id, telefone)
            if existing_phone and str(existing_phone["id"]) != str(user_id):
                return error("Telefone já cadastrado", 409)

            existing_email = AuthRepository.find_user_by_email(g.barbearia_id, email)
            if existing_email and str(existing_email["id"]) != str(user_id):
                return error("E-mail já cadastrado", 409)

            updated = AuthRepository.update_user(
                g.barbearia_id,
                user_id,
                nome,
                telefone,
                email,
                role,
                True,
                generate_password_hash(senha),
            )
            if not updated:
                return error("Não foi possível atualizar usuário existente", 500)
            return success(updated, 200)

    existing_phone = AuthRepository.find_user_by_phone(g.barbearia_id, telefone)
    if existing_phone:
        return error("Telefone já cadastrado", 409)

    existing_email = AuthRepository.find_user_by_email(g.barbearia_id, email)
    if existing_email:
        return error("E-mail já cadastrado", 409)

    try:
        user = AuthRepository.create_user(
            g.barbearia_id,
            nome,
            telefone,
            generate_password_hash(senha),
            role,
            email,
            user_id,
        )
    except UniqueViolation:
        return error("Telefone ou e-mail já cadastrado", 409)
    except Exception as exc:
        message = str(exc).lower()
        if "23505" in message or "duplicate key" in message:
            return error("Usuário já cadastrado para este identificador/contato", 409)
        raise
    return success(user, 201)


@auth_bp.put("/users/<user_id>")
@auth_required
def update_user_admin(user_id: str):
    denied = _admin_guard()
    if denied:
        return denied

    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    role = (payload.get("role") or "EMPLOYEE").upper()
    ativo = bool(payload.get("ativo", True))
    senha = payload.get("senha")

    if not nome or not telefone or not email:
        return error("nome, telefone e email são obrigatórios", 400)

    if role not in {"ADMIN", "EMPLOYEE"}:
        return error("role inválido para usuário da equipe", 400)

    existing = AuthRepository.find_user_by_id(g.barbearia_id, user_id)
    if not existing:
        return error("Usuário não encontrado", 404)

    existing_phone = AuthRepository.find_user_by_phone(g.barbearia_id, telefone)
    if existing_phone and str(existing_phone["id"]) != str(user_id):
        return error("Telefone já cadastrado", 409)

    existing_email = AuthRepository.find_user_by_email(g.barbearia_id, email)
    if existing_email and str(existing_email["id"]) != str(user_id):
        return error("E-mail já cadastrado", 409)

    senha_hash = generate_password_hash(senha) if senha else None
    updated = AuthRepository.update_user(
        g.barbearia_id,
        user_id,
        nome,
        telefone,
        email,
        role,
        ativo,
        senha_hash,
    )
    if not updated:
        return error("Usuário não encontrado", 404)
    return success(updated)


@auth_bp.delete("/users/<user_id>")
@auth_required
def delete_user_admin(user_id: str):
    denied = _admin_guard()
    if denied:
        return denied

    if str(user_id) == str(getattr(g, "user_id", "")):
        return error("Não é permitido excluir o próprio usuário logado", 409)

    deleted = AuthRepository.delete_user(g.barbearia_id, user_id)
    if not deleted:
        return error("Usuário não encontrado", 404)
    return success({"id": deleted["id"]})
