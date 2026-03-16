from datetime import datetime

from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.repositories.horarios_repository import HorariosFuncionamentoRepository
from backend.utils.http import error, success

horarios_bp = Blueprint("horarios_funcionamento", __name__, url_prefix="/horarios-funcionamento")


def _parse_time(value: str):
    return datetime.strptime(value, "%H:%M")


@horarios_bp.get("")
@auth_required
def list_horarios_funcionamento():
    try:
        return success(HorariosFuncionamentoRepository.list_all(g.barbearia_id))
    except Exception as exc:
        message = str(exc).lower()
        if "barbearia_horarios_funcionamento" in message and ("does not exist" in message or "relation" in message):
            return error("Tabela de horários não encontrada. Execute a migration 004_module4_horarios_funcionamento.sql.", 500)
        return error("Falha ao carregar horários de funcionamento.", 500)


@horarios_bp.put("")
@auth_required
def save_horarios_funcionamento():
    payload = request.get_json(silent=True) or {}
    horarios = payload.get("horarios")

    if not isinstance(horarios, list) or len(horarios) == 0:
        return error("horarios deve ser uma lista não vazia", 400)

    parsed_horarios: list[dict] = []
    for item in horarios:
        if not isinstance(item, dict):
            return error("Cada horário deve ser um objeto válido", 400)

        dia_semana = item.get("dia_semana")
        if not isinstance(dia_semana, int) or dia_semana < 0 or dia_semana > 6:
            return error("dia_semana deve ser um número entre 0 e 6", 400)

        aberto = bool(item.get("aberto"))
        hora_inicio = (item.get("hora_inicio") or "00:00").strip()
        hora_fim = (item.get("hora_fim") or "00:00").strip()

        if aberto:
            try:
                inicio_dt = _parse_time(hora_inicio)
                fim_dt = _parse_time(hora_fim)
            except Exception:
                return error("Formato de horário inválido. Use HH:MM.", 400)

            if fim_dt <= inicio_dt:
                return error("hora_fim deve ser maior que hora_inicio em dias abertos", 400)
        else:
            hora_inicio = "00:00"
            hora_fim = "00:00"

        parsed_horarios.append(
            {
                "dia_semana": dia_semana,
                "aberto": aberto,
                "hora_inicio": hora_inicio,
                "hora_fim": hora_fim,
            }
        )

    try:
        saved = HorariosFuncionamentoRepository.save_many(g.barbearia_id, parsed_horarios)
        return success(saved)
    except Exception as exc:
        message = str(exc).lower()
        if "barbearia_horarios_funcionamento" in message and ("does not exist" in message or "relation" in message):
            return error("Tabela de horários não encontrada. Execute a migration 004_module4_horarios_funcionamento.sql.", 500)
        return error("Falha ao salvar horários de funcionamento.", 500)
