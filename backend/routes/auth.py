import hmac

from flask import Blueprint, current_app, g, request
from psycopg.errors import UniqueViolation
from werkzeug.security import check_password_hash, generate_password_hash
from uuid import UUID

from backend.middleware.auth import auth_required, create_access_token, create_master_access_token, master_auth_required
from backend.repositories.auth_repository import AuthRepository
from backend.utils.http import error, success

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _admin_guard():
    if str(getattr(g, "user_role", "")).upper() != "ADMIN":
        return error("Acesso negado", 403)
    return None


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

    user = AuthRepository.find_user_by_email(g.barbearia_id, email) if email else AuthRepository.find_user_by_phone(g.barbearia_id, telefone)
    if not user or not check_password_hash(user["senha_hash"], senha):
        return error("Credenciais inválidas", 401)
    if not user.get("ativo", True):
        return error("Usuário inativo", 403)

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
