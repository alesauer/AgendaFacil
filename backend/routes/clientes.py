from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.repositories.clientes_repository import ClientesRepository
from backend.utils.http import error, success

clientes_bp = Blueprint("clientes", __name__, url_prefix="/clientes")


def _normalize_email(value):
    if value is None:
        return None
    email = str(value).strip().lower()
    return email or None


def _is_unique_violation(exc: Exception) -> bool:
    message = str(exc).lower()
    return (
        "duplicate key" in message
        or "unique constraint" in message
        or "already exists" in message
        or "23505" in message
    )


def _is_invalid_date(exc: Exception) -> bool:
    message = str(exc).lower()
    return "date" in message and ("invalid" in message or "syntax" in message)


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
    email = _normalize_email(payload.get("email"))
    data_nascimento = payload.get("data_nascimento")
    if not nome or not telefone:
        return error("nome e telefone são obrigatórios", 400)
    try:
        cliente = ClientesRepository.create(g.barbearia_id, nome, telefone, data_nascimento, email)
    except Exception as exc:
        if _is_unique_violation(exc):
            return error("Cliente já cadastrado com este telefone ou e-mail", 409)
        if _is_invalid_date(exc):
            return error("data_nascimento inválida. Use o formato YYYY-MM-DD", 400)
        return error("Falha interna ao cadastrar cliente.", 500)
    return success(cliente, 201)


@clientes_bp.put("/<cliente_id>")
@auth_required
def update_cliente(cliente_id: str):
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    email = _normalize_email(payload.get("email"))
    data_nascimento = payload.get("data_nascimento")
    if not nome or not telefone:
        return error("nome e telefone são obrigatórios", 400)
    try:
        cliente = ClientesRepository.update(
            g.barbearia_id,
            cliente_id,
            nome,
            telefone,
            data_nascimento,
            email,
        )
    except Exception as exc:
        if _is_unique_violation(exc):
            return error("Já existe outro cliente com este telefone ou e-mail", 409)
        if _is_invalid_date(exc):
            return error("data_nascimento inválida. Use o formato YYYY-MM-DD", 400)
        return error("Falha interna ao atualizar cliente.", 500)
    if not cliente:
        return error("Cliente não encontrado", 404)
    return success(cliente)


@clientes_bp.get("/publico/por-telefone")
def find_cliente_by_phone_public():
    telefone = (request.args.get("telefone") or "").strip()
    if not telefone:
        return error("telefone é obrigatório", 400)

    cliente = ClientesRepository.find_by_phone(g.barbearia_id, telefone)
    if not cliente:
        return success({"exists": False, "cliente": None})

    return success({"exists": True, "cliente": cliente})


@clientes_bp.post("/publico")
def create_cliente_public():
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    telefone = (payload.get("telefone") or "").strip()
    email = _normalize_email(payload.get("email"))
    data_nascimento = payload.get("data_nascimento")

    if not nome or not telefone:
        return error("nome e telefone são obrigatórios", 400)

    existing = ClientesRepository.find_by_phone(g.barbearia_id, telefone)
    if existing:
        return success(existing)

    try:
        cliente = ClientesRepository.create(g.barbearia_id, nome, telefone, data_nascimento, email)
    except Exception as exc:
        if _is_unique_violation(exc):
            return error("Cliente já cadastrado com este telefone ou e-mail", 409)
        if _is_invalid_date(exc):
            return error("data_nascimento inválida. Use o formato YYYY-MM-DD", 400)
        return error("Falha interna ao cadastrar cliente.", 500)
    if not cliente:
        return error("Falha ao cadastrar cliente", 500)

    return success(cliente, 201)


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
