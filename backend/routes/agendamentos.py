from flask import Blueprint, g, request
from psycopg.errors import UniqueViolation

from backend.middleware.auth import auth_required
from backend.repositories.agendamentos_repository import AgendamentosRepository
from backend.services.agenda_service import calculate_available_slots, has_conflict
from backend.utils.http import error, success

agendamentos_bp = Blueprint("agendamentos", __name__)


@agendamentos_bp.get("/agenda/disponibilidade")
@auth_required
def disponibilidade():
    profissional_id = (request.args.get("profissional_id") or "").strip()
    data = (request.args.get("data") or "").strip()
    duracao_min = int(request.args.get("duracao_min") or 0)

    if not profissional_id or not data or duracao_min <= 0:
        return error("profissional_id, data e duracao_min são obrigatórios", 400)

    slots = calculate_available_slots(
        g.barbearia_id, profissional_id, data, duracao_min
    )
    return success(slots)


@agendamentos_bp.post("/agendamentos")
@auth_required
def create_agendamento():
    payload = request.get_json(silent=True) or {}
    cliente_id = (payload.get("cliente_id") or "").strip()
    profissional_id = (payload.get("profissional_id") or "").strip()
    servico_id = (payload.get("servico_id") or "").strip()
    data = (payload.get("data") or "").strip()
    hora_inicio = (payload.get("hora_inicio") or "").strip()
    hora_fim = (payload.get("hora_fim") or "").strip()
    status = (payload.get("status") or "CONFIRMED").strip().upper()

    if not all([cliente_id, profissional_id, servico_id, data, hora_inicio, hora_fim]):
        return error("Campos obrigatórios ausentes", 400)

    existing = AgendamentosRepository.list_by_date(g.barbearia_id, profissional_id, data)
    for row in existing:
        if has_conflict(hora_inicio, hora_fim, row["hora_inicio"], row["hora_fim"]):
            return error("Conflito de horário", 409)

    blocked = AgendamentosRepository.list_bloqueios_by_date(
        g.barbearia_id, profissional_id, data
    )
    for row in blocked:
        if has_conflict(hora_inicio, hora_fim, row["hora_inicio"], row["hora_fim"]):
            return error("Horário bloqueado", 409)

    try:
        agendamento = AgendamentosRepository.create(
            g.barbearia_id,
            cliente_id,
            profissional_id,
            servico_id,
            data,
            hora_inicio,
            hora_fim,
            status,
        )
    except UniqueViolation:
        return error("Conflito de horário (constraint)", 409)

    return success(agendamento, 201)


@agendamentos_bp.get("/agendamentos")
@auth_required
def list_agendamentos():
    return success(AgendamentosRepository.list_all(g.barbearia_id))


@agendamentos_bp.put("/agendamentos/<agendamento_id>")
@auth_required
def update_agendamento(agendamento_id: str):
    payload = request.get_json(silent=True) or {}
    cliente_id = (payload.get("cliente_id") or "").strip()
    profissional_id = (payload.get("profissional_id") or "").strip()
    servico_id = (payload.get("servico_id") or "").strip()
    data = (payload.get("data") or "").strip()
    hora_inicio = (payload.get("hora_inicio") or "").strip()
    hora_fim = (payload.get("hora_fim") or "").strip()
    status = (payload.get("status") or "CONFIRMED").strip().upper()

    if not all([cliente_id, profissional_id, servico_id, data, hora_inicio, hora_fim]):
        return error("Campos obrigatórios ausentes", 400)

    existing = AgendamentosRepository.list_by_date(g.barbearia_id, profissional_id, data)
    for row in existing:
        if str(row["id"]) == str(agendamento_id):
            continue
        if has_conflict(hora_inicio, hora_fim, row["hora_inicio"], row["hora_fim"]):
            return error("Conflito de horário", 409)

    blocked = AgendamentosRepository.list_bloqueios_by_date(
        g.barbearia_id, profissional_id, data
    )
    for row in blocked:
        if has_conflict(hora_inicio, hora_fim, row["hora_inicio"], row["hora_fim"]):
            return error("Horário bloqueado", 409)

    agendamento = AgendamentosRepository.update(
        g.barbearia_id,
        agendamento_id,
        cliente_id,
        profissional_id,
        servico_id,
        data,
        hora_inicio,
        hora_fim,
        status,
    )
    if not agendamento:
        return error("Agendamento não encontrado", 404)
    return success(agendamento)


@agendamentos_bp.delete("/agendamentos/<agendamento_id>")
@auth_required
def delete_agendamento(agendamento_id: str):
    deleted = AgendamentosRepository.cancel(g.barbearia_id, agendamento_id)
    if not deleted:
        return error("Agendamento não encontrado", 404)
    return success({"id": deleted["id"]})
