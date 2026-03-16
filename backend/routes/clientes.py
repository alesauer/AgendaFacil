from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.repositories.clientes_repository import ClientesRepository
from backend.utils.http import error, success

clientes_bp = Blueprint("clientes", __name__, url_prefix="/clientes")


@clientes_bp.get("")
@auth_required
def list_clientes():
    return success(ClientesRepository.list_all(g.barbearia_id))


@clientes_bp.post("")
@auth_required
def create_cliente():
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    data_nascimento = payload.get("data_nascimento")
    if not nome or not telefone:
        return error("nome e telefone são obrigatórios", 400)
    cliente = ClientesRepository.create(g.barbearia_id, nome, telefone, data_nascimento)
    return success(cliente, 201)


@clientes_bp.put("/<cliente_id>")
@auth_required
def update_cliente(cliente_id: str):
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    data_nascimento = payload.get("data_nascimento")
    if not nome or not telefone:
        return error("nome e telefone são obrigatórios", 400)
    cliente = ClientesRepository.update(
        g.barbearia_id,
        cliente_id,
        nome,
        telefone,
        data_nascimento,
    )
    if not cliente:
        return error("Cliente não encontrado", 404)
    return success(cliente)


@clientes_bp.delete("/<cliente_id>")
@auth_required
def delete_cliente(cliente_id: str):
    try:
        if ClientesRepository.has_linked_appointments(g.barbearia_id, cliente_id):
            return error(
                "Este cliente possui agendamentos vinculados. Cancele/exclua os agendamentos antes de excluir o cliente.",
                409,
            )

        deleted = ClientesRepository.delete(g.barbearia_id, cliente_id)
        if not deleted:
            return error("Cliente não encontrado", 404)
        return success({"id": deleted["id"]})
    except Exception as exc:
        message = str(exc).lower()
        if "foreign key" in message or "fk_agendamentos_cliente_tenant" in message:
            return error(
                "Este cliente possui agendamentos vinculados. Cancele/exclua os agendamentos antes de excluir o cliente.",
                409,
            )
        return error("Falha interna ao excluir cliente.", 500)
