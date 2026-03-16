from datetime import datetime

from flask import Blueprint, g, request
from psycopg.errors import UniqueViolation

from backend.middleware.auth import auth_required
from backend.repositories.agendamentos_repository import AgendamentosRepository
from backend.repositories.horarios_repository import HorariosFuncionamentoRepository
from backend.services.agenda_service import calculate_available_slots, has_conflict
from backend.utils.http import error, success

agendamentos_bp = Blueprint("agendamentos", __name__)


def _weekday_from_date(data: str):
    weekday = datetime.strptime(data, "%Y-%m-%d").date().weekday() + 1
    return 0 if weekday == 7 else weekday


def _validate_within_business_hours(barbearia_id: str, data: str, hora_inicio: str, hora_fim: str):
    try:
        weekday = _weekday_from_date(data)
    except Exception:
        return "data inválida. Use o formato YYYY-MM-DD"

    horario = HorariosFuncionamentoRepository.get_by_weekday(barbearia_id, weekday)
    if not horario.get("aberto"):
        return "Barbearia fechada nesta data"

    abertura = str(horario.get("hora_inicio") or "00:00")[:5]
    fechamento = str(horario.get("hora_fim") or "00:00")[:5]
    inicio = str(hora_inicio or "")[:5]
    fim = str(hora_fim or "")[:5]

    if inicio < abertura or fim > fechamento:
        return f"Horário fora do funcionamento ({abertura} às {fechamento})"

    return None


@agendamentos_bp.get("/agenda/disponibilidade")
@auth_required
def disponibilidade():
    profissional_id = (request.args.get("profissional_id") or "").strip()
    data = (request.args.get("data") or "").strip()
    duracao_min = int(request.args.get("duracao_min") or 0)

    if not profissional_id or not data or duracao_min <= 0:
        return error("profissional_id, data e duracao_min são obrigatórios", 400)

    try:
        weekday = _weekday_from_date(data)
    except Exception:
        return error("data inválida. Use o formato YYYY-MM-DD", 400)

    horario = HorariosFuncionamentoRepository.get_by_weekday(g.barbearia_id, weekday)
    if not horario.get("aberto"):
        return success([])

    slots = calculate_available_slots(
        g.barbearia_id,
        profissional_id,
        data,
        duracao_min,
        horario.get("hora_inicio", "09:00"),
        horario.get("hora_fim", "18:00"),
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

    hours_error = _validate_within_business_hours(
        g.barbearia_id, data, hora_inicio, hora_fim
    )
    if hours_error:
        return error(hours_error, 409)

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
        return error("Este profissional já possui agendamento neste horário", 409)
    except Exception as exc:
        message = str(exc).lower()
        if "duplicate key" in message or "uq_agendamentos_profissional_data_hora" in message:
            return error("Este profissional já possui agendamento neste horário", 409)
        return error("Falha interna ao criar agendamento", 500)

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

    hours_error = _validate_within_business_hours(
        g.barbearia_id, data, hora_inicio, hora_fim
    )
    if hours_error:
        return error(hours_error, 409)

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

    try:
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
    except UniqueViolation:
        return error("Este profissional já possui agendamento neste horário", 409)
    except Exception as exc:
        message = str(exc).lower()
        if "duplicate key" in message or "uq_agendamentos_profissional_data_hora" in message:
            return error("Este profissional já possui agendamento neste horário", 409)
        return error("Falha interna ao atualizar agendamento", 500)
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


@agendamentos_bp.post("/agenda/bloqueios")
@auth_required
def create_bloqueio():
    try:
        payload = request.get_json(silent=True) or {}
        profissional_id = (payload.get("profissional_id") or "").strip()
        data = (payload.get("data") or "").strip()
        hora_inicio = (payload.get("hora_inicio") or "").strip()
        hora_fim = (payload.get("hora_fim") or "").strip()
        motivo = payload.get("motivo")

        if not all([profissional_id, data, hora_inicio, hora_fim]):
            return error("profissional_id, data, hora_inicio e hora_fim são obrigatórios", 400)

        if hora_fim <= hora_inicio:
            return error("hora_fim deve ser maior que hora_inicio", 400)

        hours_error = _validate_within_business_hours(
            g.barbearia_id, data, hora_inicio, hora_fim
        )
        if hours_error:
            return error(hours_error, 409)

        existing = AgendamentosRepository.list_by_date(
            g.barbearia_id, profissional_id, data
        )
        for row in existing:
            if has_conflict(hora_inicio, hora_fim, row["hora_inicio"], row["hora_fim"]):
                return error("Já existe agendamento neste horário para este profissional", 409)

        blocked = AgendamentosRepository.list_bloqueios_by_date(
            g.barbearia_id, profissional_id, data
        )
        for row in blocked:
            if has_conflict(hora_inicio, hora_fim, row["hora_inicio"], row["hora_fim"]):
                return error("Já existe bloqueio neste horário para este profissional", 409)

        bloqueio = AgendamentosRepository.create_bloqueio(
            g.barbearia_id,
            profissional_id,
            data,
            hora_inicio,
            hora_fim,
            motivo,
        )
    except UniqueViolation:
        return error("Já existe bloqueio neste horário para este profissional", 409)
    except Exception as exc:
        message = str(exc).lower()
        if "bloqueios" in message and ("does not exist" in message or "relation" in message):
            return error("Tabela de bloqueios não encontrada. Execute a migration 003_module3_core_agenda.sql.", 500)
        if "hora" in message or "time" in message or "invalid" in message:
            return error("Formato de horário inválido. Use HH:MM no início e fim.", 400)
        return error(f"Falha interna ao criar bloqueio: {str(exc)}", 500)

    if not bloqueio:
        return error("Falha ao criar bloqueio", 500)

    response = {
        "id": f"bloqueio:{bloqueio['id']}",
        "barbearia_id": bloqueio["barbearia_id"],
        "cliente_id": "blocked",
        "profissional_id": bloqueio["profissional_id"],
        "servico_id": "blocked",
        "data": bloqueio["data"],
        "hora_inicio": bloqueio["hora_inicio"],
        "hora_fim": bloqueio["hora_fim"],
        "status": "BLOCKED",
        "block_reason": bloqueio.get("motivo"),
        "is_bloqueio": True,
    }
    return success(response, 201)


@agendamentos_bp.put("/agenda/bloqueios/<bloqueio_id>")
@auth_required
def update_bloqueio(bloqueio_id: str):
    try:
        payload = request.get_json(silent=True) or {}
        profissional_id = (payload.get("profissional_id") or "").strip()
        data = (payload.get("data") or "").strip()
        hora_inicio = (payload.get("hora_inicio") or "").strip()
        hora_fim = (payload.get("hora_fim") or "").strip()
        motivo = payload.get("motivo")

        if not all([profissional_id, data, hora_inicio, hora_fim]):
            return error("profissional_id, data, hora_inicio e hora_fim são obrigatórios", 400)

        if hora_fim <= hora_inicio:
            return error("hora_fim deve ser maior que hora_inicio", 400)

        hours_error = _validate_within_business_hours(
            g.barbearia_id, data, hora_inicio, hora_fim
        )
        if hours_error:
            return error(hours_error, 409)

        existing = AgendamentosRepository.list_by_date(
            g.barbearia_id, profissional_id, data
        )
        for row in existing:
            if has_conflict(hora_inicio, hora_fim, row["hora_inicio"], row["hora_fim"]):
                return error("Já existe agendamento neste horário para este profissional", 409)

        blocked = AgendamentosRepository.list_bloqueios_by_date(
            g.barbearia_id, profissional_id, data
        )
        for row in blocked:
            if str(row["id"]) == str(bloqueio_id):
                continue
            if has_conflict(hora_inicio, hora_fim, row["hora_inicio"], row["hora_fim"]):
                return error("Já existe bloqueio neste horário para este profissional", 409)

        bloqueio = AgendamentosRepository.update_bloqueio(
            g.barbearia_id,
            bloqueio_id,
            profissional_id,
            data,
            hora_inicio,
            hora_fim,
            motivo,
        )
    except UniqueViolation:
        return error("Já existe bloqueio neste horário para este profissional", 409)
    except Exception as exc:
        message = str(exc).lower()
        if "bloqueios" in message and ("does not exist" in message or "relation" in message):
            return error("Tabela de bloqueios não encontrada. Execute a migration 003_module3_core_agenda.sql.", 500)
        if "hora" in message or "time" in message or "invalid" in message:
            return error("Formato de horário inválido. Use HH:MM no início e fim.", 400)
        return error(f"Falha interna ao atualizar bloqueio: {str(exc)}", 500)

    if not bloqueio:
        return error("Bloqueio não encontrado", 404)

    response = {
        "id": f"bloqueio:{bloqueio['id']}",
        "barbearia_id": bloqueio["barbearia_id"],
        "cliente_id": "blocked",
        "profissional_id": bloqueio["profissional_id"],
        "servico_id": "blocked",
        "data": bloqueio["data"],
        "hora_inicio": bloqueio["hora_inicio"],
        "hora_fim": bloqueio["hora_fim"],
        "status": "BLOCKED",
        "block_reason": bloqueio.get("motivo"),
        "is_bloqueio": True,
    }
    return success(response)


@agendamentos_bp.delete("/agenda/bloqueios/<bloqueio_id>")
@auth_required
def delete_bloqueio(bloqueio_id: str):
    deleted = AgendamentosRepository.delete_bloqueio(g.barbearia_id, bloqueio_id)
    if not deleted:
        return error("Bloqueio não encontrado", 404)
    return success({"id": f"bloqueio:{deleted['id']}"})
