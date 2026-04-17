from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.repositories.servicos_repository import ServicosRepository
from backend.utils.http import error, success

servicos_bp = Blueprint("servicos", __name__, url_prefix="/servicos")


@servicos_bp.get("")
@auth_required
def list_servicos():
    return success(ServicosRepository.list_all(g.barbearia_id))


@servicos_bp.get("/publico")
def list_servicos_publico():
    return success(ServicosRepository.list_all(g.barbearia_id))


@servicos_bp.post("")
@auth_required
def create_servico():
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    categoria_id = payload.get("categoria_id") or None
    try:
        duracao_min = int(payload.get("duracao_min") or 0)
        preco = float(payload.get("preco") or 0)
    except (TypeError, ValueError):
        return error("duracao_min e preco devem ser numéricos", 400)
    if not nome or duracao_min <= 0:
        return error("nome e duracao_min válidos são obrigatórios", 400)
    if preco < 0:
        return error("preco deve ser maior ou igual a zero", 400)
    servico = ServicosRepository.create(
        g.barbearia_id,
        categoria_id,
        nome,
        duracao_min,
        preco,
    )
    return success(servico, 201)


@servicos_bp.put("/ordem")
@auth_required
def reorder_servicos():
    payload = request.get_json(silent=True) or {}
    service_ids = payload.get("service_ids")
    if not isinstance(service_ids, list):
        return error("service_ids deve ser um array", 400)

    result = ServicosRepository.reorder(g.barbearia_id, service_ids)
    if result.get("error"):
        return error(result["error"], 400)

    return success(result.get("data") or [])


@servicos_bp.put("/<servico_id>")
@auth_required
def update_servico(servico_id: str):
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    categoria_id = payload.get("categoria_id") or None
    try:
        duracao_min = int(payload.get("duracao_min") or 0)
        preco = float(payload.get("preco") or 0)
    except (TypeError, ValueError):
        return error("duracao_min e preco devem ser numéricos", 400)
    if not nome or duracao_min <= 0:
        return error("nome e duracao_min válidos são obrigatórios", 400)
    if preco < 0:
        return error("preco deve ser maior ou igual a zero", 400)
    servico = ServicosRepository.update(
        g.barbearia_id,
        servico_id,
        categoria_id,
        nome,
        duracao_min,
        preco,
    )
    if not servico:
        return error("Serviço não encontrado", 404)
    return success(servico)


@servicos_bp.delete("/<servico_id>")
@auth_required
def delete_servico(servico_id: str):
    try:
        if ServicosRepository.has_linked_appointments(g.barbearia_id, servico_id):
            return error(
                "Este serviço possui agendamentos vinculados. Cancele/exclua os agendamentos antes de excluir o serviço.",
                409,
            )

        deleted = ServicosRepository.delete(g.barbearia_id, servico_id)
        if not deleted:
            return error("Serviço não encontrado", 404)
        return success({"id": deleted["id"]})
    except Exception as exc:
        message = str(exc).lower()
        if "foreign key" in message or "fk_agendamentos_servico_tenant" in message:
            return error(
                "Este serviço possui agendamentos vinculados. Cancele/exclua os agendamentos antes de excluir o serviço.",
                409,
            )
        return error("Falha interna ao excluir serviço.", 500)
