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


def _parse_comissao_percentual(value) -> tuple[float, str | None]:
    if value is None or value == "":
        return 0.0, None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0, "comissao_percentual deve ser um número entre 0 e 100"

    if parsed < 0 or parsed > 100:
        return 0.0, "comissao_percentual deve estar entre 0 e 100"

    return round(parsed, 2), None


@profissionais_bp.get("")
@auth_required
def list_profissionais():
    return success(ProfissionaisRepository.list_all(g.barbearia_id))


@profissionais_bp.get("/publico")
def list_profissionais_publico():
    profissionais = ProfissionaisRepository.list_all(g.barbearia_id)
    ativos = [item for item in profissionais if bool(item.get("ativo", True))]
    return success(ativos)


@profissionais_bp.post("")
@auth_required
def create_profissional():
    payload = request.get_json(silent=True) or {}
    profissional_id = payload.get("id")
    nome = (payload.get("nome") or "").strip()
    cargo = (payload.get("cargo") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    foto_url = payload.get("foto_url")
    comissao_percentual, comissao_error = _parse_comissao_percentual(
        payload.get("comissao_percentual")
    )
    if not nome:
        return error("nome é obrigatório", 400)
    if comissao_error:
        return error(comissao_error, 400)
    profissional = ProfissionaisRepository.create(
        g.barbearia_id,
        nome,
        cargo,
        telefone,
        foto_url,
        comissao_percentual,
        profissional_id,
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
    comissao_percentual, comissao_error = _parse_comissao_percentual(
        payload.get("comissao_percentual")
    )
    ativo = _parse_bool(payload.get("ativo"), True)
    if not nome:
        return error("nome é obrigatório", 400)
    if comissao_error:
        return error(comissao_error, 400)
    profissional = ProfissionaisRepository.update(
        g.barbearia_id,
        profissional_id,
        nome,
        cargo,
        telefone,
        foto_url,
        comissao_percentual,
        ativo,
    )
    if not profissional:
        return error("Profissional não encontrado", 404)
    return success(profissional)


@profissionais_bp.delete("/<profissional_id>")
@auth_required
def delete_profissional(profissional_id: str):
    try:
        deleted = ProfissionaisRepository.delete(g.barbearia_id, profissional_id)
        if not deleted:
            return error("Profissional não encontrado", 404)
        return success({"id": deleted["id"], "inactivated": True})
    except Exception as exc:
        message = str(exc).lower()
        if "foreign key" in message or "fk_agendamentos_profissional_tenant" in message:
            return error(
                "Não foi possível inativar o profissional.",
                409,
            )
        return error("Falha interna ao inativar profissional.", 500)
