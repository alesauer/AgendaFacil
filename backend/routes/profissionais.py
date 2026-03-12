from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.repositories.profissionais_repository import ProfissionaisRepository
from backend.utils.http import error, success

profissionais_bp = Blueprint("profissionais", __name__, url_prefix="/profissionais")


def _parse_bool(value, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "t", "sim", "yes", "y"}:
            return True
        if normalized in {"0", "false", "f", "nao", "não", "no", "n"}:
            return False
    return default


@profissionais_bp.get("")
@auth_required
def list_profissionais():
    return success(ProfissionaisRepository.list_all(g.barbearia_id))


@profissionais_bp.post("")
@auth_required
def create_profissional():
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    cargo = (payload.get("cargo") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    foto_url = payload.get("foto_url")
    if not nome:
        return error("nome é obrigatório", 400)
    profissional = ProfissionaisRepository.create(
        g.barbearia_id, nome, cargo, telefone, foto_url
    )
    return success(profissional, 201)


@profissionais_bp.put("/<profissional_id>")
@auth_required
def update_profissional(profissional_id: str):
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    cargo = (payload.get("cargo") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    foto_url = payload.get("foto_url")
    ativo = _parse_bool(payload.get("ativo"), True)
    if not nome:
        return error("nome é obrigatório", 400)
    profissional = ProfissionaisRepository.update(
        g.barbearia_id,
        profissional_id,
        nome,
        cargo,
        telefone,
        foto_url,
        ativo,
    )
    if not profissional:
        return error("Profissional não encontrado", 404)
    return success(profissional)


@profissionais_bp.delete("/<profissional_id>")
@auth_required
def delete_profissional(profissional_id: str):
    deleted = ProfissionaisRepository.delete(g.barbearia_id, profissional_id)
    if not deleted:
        return error("Profissional não encontrado", 404)
    return success({"id": deleted["id"]})
