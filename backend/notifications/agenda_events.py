from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from backend.repositories.notifications_repository import NotificationsRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


EXCLUDED_REMINDER_STATUS = {
    "CANCELLED",
    "NO_SHOW",
    "COMPLETED_OP",
    "COMPLETED_FIN",
    "BLOCKED",
    "COMPLETED",
}


def _to_br_date(iso_date: str) -> str:
    raw = str(iso_date or "")[:10]
    if len(raw) == 10 and raw.count("-") == 2:
        y, m, d = raw.split("-")
        return f"{d}/{m}/{y}"
    return raw


def _build_payload(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "agendamento_id": str(snapshot.get("agendamento_id") or ""),
        "client_name": str(snapshot.get("cliente_nome") or "Cliente"),
        "service_name": str(snapshot.get("servico_nome") or "Serviço"),
        "professional_name": str(snapshot.get("profissional_nome") or "Profissional"),
        "appointment_date": _to_br_date(str(snapshot.get("data") or "")),
        "appointment_time": str(snapshot.get("hora_inicio") or "")[:5],
        "raw_date": str(snapshot.get("data") or "")[:10],
        "raw_time": str(snapshot.get("hora_inicio") or "")[:5],
    }


def _normalize_phone(raw: str) -> str:
    digits = "".join(ch for ch in str(raw or "") if ch.isdigit())
    if not digits:
        return ""
    if digits.startswith("55"):
        return digits
    return f"55{digits}"


def _fetch_appointment_snapshot(barbearia_id: str, agendamento_id: str) -> dict[str, Any] | None:
    if not is_supabase_ready():
        return None

    supabase = get_supabase_client()
    apt_response = (
        supabase.table("agendamentos")
        .select("id,data,hora_inicio,status,cliente_id,profissional_id,servico_id")
        .eq("barbearia_id", barbearia_id)
        .eq("id", agendamento_id)
        .limit(1)
        .execute()
    )
    appointments = apt_response.data or []
    if not appointments:
        return None

    appointment = appointments[0]
    cliente_id = str(appointment.get("cliente_id") or "")
    profissional_id = str(appointment.get("profissional_id") or "")
    servico_id = str(appointment.get("servico_id") or "")

    cliente_nome = "Cliente"
    cliente_telefone = ""
    if cliente_id:
        cliente_response = (
            supabase.table("clientes")
            .select("nome,telefone")
            .eq("barbearia_id", barbearia_id)
            .eq("id", cliente_id)
            .limit(1)
            .execute()
        )
        clientes = cliente_response.data or []
        if clientes:
            cliente_nome = str(clientes[0].get("nome") or "Cliente")
            cliente_telefone = _normalize_phone(str(clientes[0].get("telefone") or ""))

    profissional_nome = "Profissional"
    if profissional_id:
        profissional_response = (
            supabase.table("profissionais")
            .select("nome")
            .eq("barbearia_id", barbearia_id)
            .eq("id", profissional_id)
            .limit(1)
            .execute()
        )
        profissionais = profissional_response.data or []
        if profissionais:
            profissional_nome = str(profissionais[0].get("nome") or "Profissional")

    servico_nome = "Serviço"
    if servico_id:
        servico_response = (
            supabase.table("servicos")
            .select("nome")
            .eq("barbearia_id", barbearia_id)
            .eq("id", servico_id)
            .limit(1)
            .execute()
        )
        servicos = servico_response.data or []
        if servicos:
            servico_nome = str(servicos[0].get("nome") or "Serviço")

    return {
        "agendamento_id": str(appointment.get("id") or ""),
        "status": str(appointment.get("status") or "").upper(),
        "data": str(appointment.get("data") or "")[:10],
        "hora_inicio": str(appointment.get("hora_inicio") or "")[:5],
        "cliente_nome": cliente_nome,
        "cliente_telefone": cliente_telefone,
        "profissional_nome": profissional_nome,
        "servico_nome": servico_nome,
    }


def enqueue_for_appointment_event(
    barbearia_id: str,
    agendamento_id: str,
    template_key: str,
    correlation_id: str | None = None,
):
    snapshot = _fetch_appointment_snapshot(barbearia_id, agendamento_id)
    if not snapshot:
        return None

    recipient = str(snapshot.get("cliente_telefone") or "")
    if not recipient:
        return None

    payload = _build_payload(snapshot)
    idempotency_key = f"{template_key}:{agendamento_id}:WHATSAPP"
    return NotificationsRepository.enqueue_dispatch(
        barbearia_id=barbearia_id,
        channel="WHATSAPP",
        provider_name="EVOLUTION",
        recipient=recipient,
        template_key=template_key,
        payload=payload,
        idempotency_key=idempotency_key,
        correlation_id=correlation_id,
    )


def enqueue_reminders_d1(barbearia_id: str) -> dict[str, int]:
    if not is_supabase_ready():
        return {"found": 0, "queued": 0, "skipped": 0}

    target_date = (date.today() + timedelta(days=1)).isoformat()
    supabase = get_supabase_client()

    response = (
        supabase.table("agendamentos")
        .select("id,status")
        .eq("barbearia_id", barbearia_id)
        .eq("data", target_date)
        .execute()
    )
    rows = response.data or []

    found = len(rows)
    queued = 0
    skipped = 0

    for row in rows:
        agendamento_id = str(row.get("id") or "")
        status = str(row.get("status") or "").upper()
        if not agendamento_id or status in EXCLUDED_REMINDER_STATUS:
            skipped += 1
            continue

        item = enqueue_for_appointment_event(
            barbearia_id,
            agendamento_id,
            "APPOINTMENT_REMINDER_D1",
            correlation_id=f"reminder-d1:{target_date}",
        )
        if item:
            queued += 1
        else:
            skipped += 1

    return {"found": found, "queued": queued, "skipped": skipped}
