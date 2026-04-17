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
        "service_price": snapshot.get("servico_preco"),
        "professional_name": str(snapshot.get("profissional_nome") or "Profissional"),
        "location": str(snapshot.get("barbearia_local") or "Local não informado"),
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
    cliente_email = ""
    if cliente_id:
        try:
            cliente_response = (
                supabase.table("clientes")
                .select("nome,telefone,email")
                .eq("barbearia_id", barbearia_id)
                .eq("id", cliente_id)
                .limit(1)
                .execute()
            )
        except Exception:
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
            cliente_email = str(clientes[0].get("email") or "").strip()

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
    servico_preco = None
    if servico_id:
        servico_response = (
            supabase.table("servicos")
            .select("nome,preco")
            .eq("barbearia_id", barbearia_id)
            .eq("id", servico_id)
            .limit(1)
            .execute()
        )
        servicos = servico_response.data or []
        if servicos:
            servico_nome = str(servicos[0].get("nome") or "Serviço")
            servico_preco = servicos[0].get("preco")

    barbearia_local = "Local não informado"
    try:
        barbearia_response = (
            supabase.table("barbearias")
            .select("cidade")
            .eq("id", barbearia_id)
            .limit(1)
            .execute()
        )
        barbearias = barbearia_response.data or []
        if barbearias:
            cidade = str(barbearias[0].get("cidade") or "").strip()
            if cidade:
                barbearia_local = cidade
    except Exception:
        pass

    return {
        "agendamento_id": str(appointment.get("id") or ""),
        "status": str(appointment.get("status") or "").upper(),
        "data": str(appointment.get("data") or "")[:10],
        "hora_inicio": str(appointment.get("hora_inicio") or "")[:5],
        "cliente_nome": cliente_nome,
        "cliente_telefone": cliente_telefone,
        "cliente_email": cliente_email,
        "profissional_nome": profissional_nome,
        "servico_nome": servico_nome,
        "servico_preco": servico_preco,
        "barbearia_local": barbearia_local,
    }


def enqueue_for_appointment_event(
    barbearia_id: str,
    agendamento_id: str,
    template_key: str,
    correlation_id: str | None = None,
    idempotency_suffix: str | None = None,
):
    snapshot = _fetch_appointment_snapshot(barbearia_id, agendamento_id)
    if not snapshot:
        return None

    payload = _build_payload(snapshot)
    queued_items: list[dict[str, Any]] = []

    phone_recipient = str(snapshot.get("cliente_telefone") or "")
    if phone_recipient:
        base_idempotency_whatsapp = f"{template_key}:{agendamento_id}:WHATSAPP"
        idempotency_key_whatsapp = (
            f"{base_idempotency_whatsapp}:{idempotency_suffix}"
            if idempotency_suffix
            else base_idempotency_whatsapp
        )
        created = NotificationsRepository.enqueue_dispatch(
            barbearia_id=barbearia_id,
            channel="WHATSAPP",
            provider_name="EVOLUTION",
            recipient=phone_recipient,
            template_key=template_key,
            payload=payload,
            idempotency_key=idempotency_key_whatsapp,
            correlation_id=correlation_id,
        )
        if created:
            queued_items.append(created)

    email_recipient = str(snapshot.get("cliente_email") or "").strip()
    if email_recipient:
        base_idempotency_email = f"{template_key}:{agendamento_id}:EMAIL"
        idempotency_key_email = (
            f"{base_idempotency_email}:{idempotency_suffix}"
            if idempotency_suffix
            else base_idempotency_email
        )
        created = NotificationsRepository.enqueue_dispatch(
            barbearia_id=barbearia_id,
            channel="EMAIL",
            provider_name="RESEND",
            recipient=email_recipient,
            template_key=template_key,
            payload=payload,
            idempotency_key=idempotency_key_email,
            correlation_id=correlation_id,
        )
        if created:
            queued_items.append(created)

    if not queued_items:
        return None
    return {"items": queued_items, "count": len(queued_items)}


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
