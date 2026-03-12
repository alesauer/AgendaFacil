from flask import Blueprint, g, request
from psycopg.errors import UniqueViolation
from werkzeug.security import check_password_hash, generate_password_hash

from backend.middleware.auth import auth_required, create_access_token
from backend.repositories.auth_repository import AuthRepository
from backend.utils.http import error, success

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.post("/signup")
def signup():
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    senha = payload.get("senha") or ""
    role = (payload.get("role") or "ADMIN").upper()

    if not nome or not telefone or not senha:
        return error("nome, telefone e senha são obrigatórios", 400)

    if role not in {"ADMIN", "EMPLOYEE", "CLIENT"}:
        return error("role inválido", 400)

    existing = AuthRepository.find_user_by_phone(g.barbearia_id, telefone)
    if existing:
        return error("Usuário já cadastrado", 409)

    try:
        user = AuthRepository.create_user(
            g.barbearia_id,
            nome,
            telefone,
            generate_password_hash(senha),
            role,
        )
    except UniqueViolation:
        return error("Telefone já cadastrado nesta barbearia", 409)

    safe_user = {
        "id": user["id"],
        "barbearia_id": user["barbearia_id"],
        "nome": user["nome"],
        "telefone": user["telefone"],
        "role": user["role"],
        "ativo": user["ativo"],
    }

    token = create_access_token(str(user["id"]), str(user["barbearia_id"]), user["role"])
    return success({"token": token, "user": safe_user}, 201)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    telefone = (payload.get("telefone") or "").strip()
    senha = payload.get("senha") or ""

    if not telefone or not senha:
        return error("telefone e senha são obrigatórios", 400)

    user = AuthRepository.find_user_by_phone(g.barbearia_id, telefone)
    if not user or not check_password_hash(user["senha_hash"], senha):
        return error("Credenciais inválidas", 401)

    token = create_access_token(str(user["id"]), str(user["barbearia_id"]), user["role"])
    safe_user = {
        "id": user["id"],
        "barbearia_id": user["barbearia_id"],
        "nome": user["nome"],
        "telefone": user["telefone"],
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
