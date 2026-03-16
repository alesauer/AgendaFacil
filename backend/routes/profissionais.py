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
    profissional_id = payload.get("id")
    nome = (payload.get("nome") or "").strip()
    cargo = (payload.get("cargo") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    foto_url = payload.get("foto_url")
    if not nome:
        return error("nome é obrigatório", 400)
    profissional = ProfissionaisRepository.create(
        g.barbearia_id, nome, cargo, telefone, foto_url, profissional_id
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
    try:
        if ProfissionaisRepository.has_linked_appointments(
            g.barbearia_id, profissional_id
        ):
            return error(
                "Este profissional possui agendamentos vinculados. Cancele/exclua os agendamentos antes de excluir o profissional.",
                409,
            )

        deleted = ProfissionaisRepository.delete(g.barbearia_id, profissional_id)
        if not deleted:
            return error("Profissional não encontrado", 404)
        return success({"id": deleted["id"]})
    except Exception as exc:
        message = str(exc).lower()
        if "foreign key" in message or "fk_agendamentos_profissional_tenant" in message:
            return error(
                "Este profissional possui agendamentos vinculados. Cancele/exclua os agendamentos antes de excluir o profissional.",
                409,
            )
        return error("Falha interna ao excluir profissional.", 500)
