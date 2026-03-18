from datetime import datetime

from flask import Blueprint, g, request
from psycopg.errors import UniqueViolation

from backend.middleware.auth import auth_required
from backend.repositories.agendamentos_repository import AgendamentosRepository
from backend.repositories.horarios_repository import HorariosFuncionamentoRepository
from backend.services.agenda_service import calculate_available_slots, has_conflict
from backend.utils.http import error, success

agendamentos_bp = Blueprint("agendamentos", __name__)

ALLOWED_STATUS = {
    "PENDING_PAYMENT",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED_OP",
    "COMPLETED_FIN",
    "REOPENED",
    "NO_SHOW",
    "CANCELLED",
    "BLOCKED",
    "COMPLETED",
}

TRANSITIONS = {
    "PENDING_PAYMENT": {"CONFIRMED", "CANCELLED", "NO_SHOW", "COMPLETED_FIN"},
    "CONFIRMED": {"IN_PROGRESS", "CANCELLED", "REOPENED", "NO_SHOW", "COMPLETED_FIN"},
    "IN_PROGRESS": {"COMPLETED_OP", "CANCELLED", "NO_SHOW", "COMPLETED_FIN"},
    "COMPLETED_OP": {"COMPLETED_FIN", "REOPENED"},
    "COMPLETED_FIN": {"REOPENED"},
    "REOPENED": {"IN_PROGRESS", "CANCELLED", "NO_SHOW", "COMPLETED_FIN"},
    "NO_SHOW": {"REOPENED"},
}


def _is_employee() -> bool:
    return str(getattr(g, "user_role", "")).upper() == "EMPLOYEE"


def _employee_profissional_guard(profissional_id: str):
    if _is_employee() and str(profissional_id) != str(getattr(g, "user_id", "")):
        return error("Funcionário só pode gerenciar os próprios agendamentos", 403)
    return None


def _normalized_status(value: str) -> str:
    status = str(value or "").strip().upper()
    if status == "COMPLETED":
        return "COMPLETED_OP"
    return status


def _validate_status_transition(current_status: str, next_status: str):
    normalized_current = _normalized_status(current_status)
    normalized_next = _normalized_status(next_status)
    if normalized_next not in ALLOWED_STATUS:
        return error("status inválido", 400)
    if normalized_current == normalized_next:
        return None
    allowed = TRANSITIONS.get(normalized_current, set())
    if normalized_next not in allowed:
        return error(f"Transição inválida: {normalized_current} -> {normalized_next}", 409)
    return None


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


def _validate_client_not_in_past(data: str, hora_inicio: str):
    try:
        appointment_start = datetime.strptime(f"{data} {hora_inicio}", "%Y-%m-%d %H:%M")
    except Exception:
        return "data/hora inválida. Use data YYYY-MM-DD e hora HH:MM"

    now = datetime.now()
    if appointment_start < now:
        return "Não é permitido agendar em horário anterior ao atual"

    return None


def _filter_past_slots(data: str, slots: list[dict]):
    today = datetime.now().date().isoformat()
    if data != today:
        return slots

    now_hhmm = datetime.now().strftime("%H:%M")
    return [slot for slot in slots if str(slot.get("hora_inicio") or "") >= now_hhmm]


def _get_disponibilidade(profissional_id: str, data: str, duracao_min: int):
    if not profissional_id or not data or duracao_min <= 0:
        return None, error("profissional_id, data e duracao_min são obrigatórios", 400)

    try:
        weekday = _weekday_from_date(data)
    except Exception:
        return None, error("data inválida. Use o formato YYYY-MM-DD", 400)

    horario = HorariosFuncionamentoRepository.get_by_weekday(g.barbearia_id, weekday)
    if not horario.get("aberto"):
        return [], None

    slots = calculate_available_slots(
        g.barbearia_id,
        profissional_id,
        data,
        duracao_min,
        horario.get("hora_inicio", "09:00"),
        horario.get("hora_fim", "18:00"),
    )
    return _filter_past_slots(data, slots), None


@agendamentos_bp.get("/agenda/disponibilidade")
@auth_required
def disponibilidade():
    profissional_id = (request.args.get("profissional_id") or "").strip()
    data = (request.args.get("data") or "").strip()
    duracao_min = int(request.args.get("duracao_min") or 0)

    slots, err = _get_disponibilidade(profissional_id, data, duracao_min)
    if err:
        return err
    return success(slots)


@agendamentos_bp.get("/agenda/disponibilidade/publico")
def disponibilidade_publico():
    profissional_id = (request.args.get("profissional_id") or "").strip()
    data = (request.args.get("data") or "").strip()
    duracao_min = int(request.args.get("duracao_min") or 0)

    slots, err = _get_disponibilidade(profissional_id, data, duracao_min)
    if err:
        return err
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
    status = _normalized_status(payload.get("status") or "CONFIRMED")

    if not all([cliente_id, profissional_id, servico_id, data, hora_inicio, hora_fim]):
        return error("Campos obrigatórios ausentes", 400)

    if status not in {"PENDING_PAYMENT", "CONFIRMED"}:
        return error("status inválido para criação", 400)

    denied = _employee_profissional_guard(profissional_id)
    if denied:
        return denied

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


@agendamentos_bp.post("/agendamentos/publico")
def create_agendamento_publico():
    payload = request.get_json(silent=True) or {}
    cliente_id = (payload.get("cliente_id") or "").strip()
    profissional_id = (payload.get("profissional_id") or "").strip()
    servico_id = (payload.get("servico_id") or "").strip()
    data = (payload.get("data") or "").strip()
    hora_inicio = (payload.get("hora_inicio") or "").strip()
    hora_fim = (payload.get("hora_fim") or "").strip()
    status = _normalized_status(payload.get("status") or "PENDING_PAYMENT")

    if not all([cliente_id, profissional_id, servico_id, data, hora_inicio, hora_fim]):
        return error("Campos obrigatórios ausentes", 400)

    if status not in {"PENDING_PAYMENT", "CONFIRMED"}:
        return error("status inválido para criação", 400)

    not_past_error = _validate_client_not_in_past(data, hora_inicio)
    if not_past_error:
        return error(not_past_error, 409)

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


@agendamentos_bp.patch("/agendamentos/publico/<agendamento_id>/cancelar")
def cancel_agendamento_publico(agendamento_id: str):
    payload = request.get_json(silent=True) or {}
    cliente_id = (payload.get("cliente_id") or "").strip()
    motivo = (payload.get("motivo") or "").strip() or "Cancelado pelo cliente"

    if not cliente_id:
        return error("cliente_id é obrigatório", 400)

    existing = AgendamentosRepository.get_agendamento_by_id(g.barbearia_id, agendamento_id)
    if not existing:
        return error("Agendamento não encontrado", 404)

    if str(existing.get("cliente_id") or "") != cliente_id:
        return error("Acesso negado", 403)

    transition_error = _validate_status_transition(existing.get("status") or "CONFIRMED", "CANCELLED")
    if transition_error:
        return transition_error

    updated = AgendamentosRepository.transition_status(
        g.barbearia_id,
        agendamento_id,
        "CANCELLED",
        motivo,
    )
    if not updated:
        return error("Agendamento não encontrado", 404)

    AgendamentosRepository.add_status_audit(
        g.barbearia_id,
        agendamento_id,
        _normalized_status(existing.get("status") or "CONFIRMED"),
        "CANCELLED",
        None,
        "CLIENT",
        motivo,
        None,
        None,
    )

    return success(updated)


@agendamentos_bp.put("/agendamentos/publico/<agendamento_id>")
def remarca_agendamento_publico(agendamento_id: str):
    payload = request.get_json(silent=True) or {}
    cliente_id = (payload.get("cliente_id") or "").strip()
    data = (payload.get("data") or "").strip()
    hora_inicio = (payload.get("hora_inicio") or "").strip()
    hora_fim = (payload.get("hora_fim") or "").strip()

    if not all([cliente_id, data, hora_inicio, hora_fim]):
        return error("cliente_id, data, hora_inicio e hora_fim são obrigatórios", 400)

    existing = AgendamentosRepository.get_agendamento_by_id(g.barbearia_id, agendamento_id)
    if not existing:
        return error("Agendamento não encontrado", 404)

    if str(existing.get("cliente_id") or "") != cliente_id:
        return error("Acesso negado", 403)

    if _normalized_status(existing.get("status") or "") == "CANCELLED":
        return error("Não é possível remarcar um agendamento cancelado", 409)

    not_past_error = _validate_client_not_in_past(data, hora_inicio)
    if not_past_error:
        return error(not_past_error, 409)

    hours_error = _validate_within_business_hours(
        g.barbearia_id, data, hora_inicio, hora_fim
    )
    if hours_error:
        return error(hours_error, 409)

    profissional_id = str(existing.get("profissional_id") or "")
    existing_on_day = AgendamentosRepository.list_by_date(g.barbearia_id, profissional_id, data)
    for row in existing_on_day:
        if str(row.get("id")) == str(agendamento_id):
            continue
        if has_conflict(hora_inicio, hora_fim, row["hora_inicio"], row["hora_fim"]):
            return error("Conflito de horário", 409)

    blocked = AgendamentosRepository.list_bloqueios_by_date(
        g.barbearia_id, profissional_id, data
    )
    for row in blocked:
        if has_conflict(hora_inicio, hora_fim, row["hora_inicio"], row["hora_fim"]):
            return error("Horário bloqueado", 409)

    status = _normalized_status(existing.get("status") or "CONFIRMED")
    updated = AgendamentosRepository.update(
        g.barbearia_id,
        agendamento_id,
        cliente_id,
        profissional_id,
        str(existing.get("servico_id") or ""),
        data,
        hora_inicio,
        hora_fim,
        status,
    )
    if not updated:
        return error("Agendamento não encontrado", 404)

    return success(updated)


@agendamentos_bp.get("/agendamentos")
@auth_required
def list_agendamentos():
    return success(AgendamentosRepository.list_all(g.barbearia_id))


@agendamentos_bp.get("/agendamentos/publico")
def list_agendamentos_publico():
    cliente_id = (request.args.get("cliente_id") or "").strip()
    if not cliente_id:
        return error("cliente_id é obrigatório", 400)
    return success(AgendamentosRepository.list_by_client(g.barbearia_id, cliente_id))


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
    status = _normalized_status(payload.get("status") or "CONFIRMED")

    if not all([cliente_id, profissional_id, servico_id, data, hora_inicio, hora_fim]):
        return error("Campos obrigatórios ausentes", 400)

    existing_row = AgendamentosRepository.get_agendamento_by_id(g.barbearia_id, agendamento_id)
    if not existing_row:
        return error("Agendamento não encontrado", 404)

    denied_existing = _employee_profissional_guard(str(existing_row.get("profissional_id") or ""))
    if denied_existing:
        return denied_existing

    denied_target = _employee_profissional_guard(profissional_id)
    if denied_target:
        return denied_target

    transition_error = _validate_status_transition(existing_row.get("status") or "CONFIRMED", status)
    if transition_error:
        return transition_error

    if _is_employee() and status in {"COMPLETED_FIN", "REOPENED"}:
        return error("Somente administradores podem concluir financeiro ou reabrir", 403)

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


@agendamentos_bp.patch("/agendamentos/<agendamento_id>/status")
@auth_required
def transition_agendamento_status(agendamento_id: str):
    payload = request.get_json(silent=True) or {}
    new_status = _normalized_status(payload.get("status") or "")
    motivo = (payload.get("motivo") or "").strip() or None
    forma_pagamento = (payload.get("forma_pagamento") or "").strip() or None
    valor_final_raw = payload.get("valor_final")

    try:
        valor_final = float(valor_final_raw) if valor_final_raw is not None else None
    except (TypeError, ValueError):
        return error("valor_final inválido", 400)

    existing = AgendamentosRepository.get_agendamento_by_id(g.barbearia_id, agendamento_id)
    if not existing:
        return error("Agendamento não encontrado", 404)

    denied = _employee_profissional_guard(str(existing.get("profissional_id") or ""))
    if denied:
        return denied

    transition_error = _validate_status_transition(existing.get("status") or "CONFIRMED", new_status)
    if transition_error:
        return transition_error

    if _is_employee() and new_status in {"COMPLETED_FIN", "REOPENED"}:
        return error("Somente administradores podem concluir financeiro ou reabrir", 403)

    if new_status == "COMPLETED_FIN" and not forma_pagamento:
        return error("forma_pagamento é obrigatória para conclusão financeira", 400)

    if new_status == "REOPENED" and not motivo:
        return error("motivo é obrigatório para reabertura", 400)

    updated = AgendamentosRepository.transition_status(
        g.barbearia_id,
        agendamento_id,
        new_status,
        motivo,
        forma_pagamento,
        valor_final,
    )
    if not updated:
        return error("Agendamento não encontrado", 404)

    AgendamentosRepository.add_status_audit(
        g.barbearia_id,
        agendamento_id,
        _normalized_status(existing.get("status") or "CONFIRMED"),
        new_status,
        str(getattr(g, "user_id", "")) or None,
        str(getattr(g, "user_role", "")) or None,
        motivo,
        forma_pagamento,
        valor_final,
    )

    return success(updated)


@agendamentos_bp.delete("/agendamentos/<agendamento_id>")
@auth_required
def delete_agendamento(agendamento_id: str):
    existing_row = AgendamentosRepository.get_agendamento_by_id(g.barbearia_id, agendamento_id)
    if not existing_row:
        return error("Agendamento não encontrado", 404)

    denied = _employee_profissional_guard(str(existing_row.get("profissional_id") or ""))
    if denied:
        return denied

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

        denied = _employee_profissional_guard(profissional_id)
        if denied:
            return denied

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

        existing_bloqueio = AgendamentosRepository.get_bloqueio_by_id(g.barbearia_id, bloqueio_id)
        if not existing_bloqueio:
            return error("Bloqueio não encontrado", 404)

        denied_existing = _employee_profissional_guard(str(existing_bloqueio.get("profissional_id") or ""))
        if denied_existing:
            return denied_existing

        denied_target = _employee_profissional_guard(profissional_id)
        if denied_target:
            return denied_target

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
    existing_bloqueio = AgendamentosRepository.get_bloqueio_by_id(g.barbearia_id, bloqueio_id)
    if not existing_bloqueio:
        return error("Bloqueio não encontrado", 404)

    denied = _employee_profissional_guard(str(existing_bloqueio.get("profissional_id") or ""))
    if denied:
        return denied

    deleted = AgendamentosRepository.delete_bloqueio(g.barbearia_id, bloqueio_id)
    if not deleted:
        return error("Bloqueio não encontrado", 404)
    return success({"id": f"bloqueio:{deleted['id']}"})
