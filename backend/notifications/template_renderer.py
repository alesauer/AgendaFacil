from __future__ import annotations

from typing import Any


def _safe(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def render_whatsapp_template(template_key: str, variables: dict[str, Any]) -> str:
    key = str(template_key or "").upper()
    nome = _safe(variables.get("client_name"), "cliente")
    servico = _safe(variables.get("service_name"), "serviço")
    profissional = _safe(variables.get("professional_name"), "profissional")
    data = _safe(variables.get("appointment_date"), "--/--/----")
    hora = _safe(variables.get("appointment_time"), "--:--")

    if key == "APPOINTMENT_CREATED":
        return (
            f"Olá, {nome}! Seu agendamento foi confirmado para {data} às {hora}. "
            f"Serviço: {servico}. Profissional: {profissional}."
        )

    if key == "APPOINTMENT_CANCELLED":
        return (
            f"Olá, {nome}. Seu agendamento de {servico} com {profissional}, "
            f"marcado para {data} às {hora}, foi cancelado."
        )

    if key == "APPOINTMENT_REMINDER_D1":
        return (
            f"Lembrete: {nome}, você tem agendamento amanhã ({data}) às {hora}. "
            f"Serviço: {servico} com {profissional}."
        )

    custom = _safe(variables.get("message"))
    if custom:
        return custom

    return f"[{key}] Notificação da AgendaFácil"


def render_email_template(template_key: str, variables: dict[str, Any]) -> dict[str, str]:
    key = str(template_key or "").upper()
    nome = _safe(variables.get("client_name"), "cliente")
    servico = _safe(variables.get("service_name"), "serviço")
    profissional = _safe(variables.get("professional_name"), "profissional")
    data = _safe(variables.get("appointment_date"), "--/--/----")
    hora = _safe(variables.get("appointment_time"), "--:--")

    if key == "APPOINTMENT_CREATED":
        subject = "Agendamento confirmado"
        text = (
            f"Olá, {nome}! Seu agendamento foi confirmado para {data} às {hora}. "
            f"Serviço: {servico}. Profissional: {profissional}."
        )
    elif key == "APPOINTMENT_CANCELLED":
        subject = "Agendamento cancelado"
        text = (
            f"Olá, {nome}. Seu agendamento de {servico} com {profissional}, "
            f"marcado para {data} às {hora}, foi cancelado."
        )
    elif key == "APPOINTMENT_REMINDER_D1":
        subject = "Lembrete do seu agendamento"
        text = (
            f"Lembrete: {nome}, você tem agendamento amanhã ({data}) às {hora}. "
            f"Serviço: {servico} com {profissional}."
        )
    else:
        subject = "Notificação AgendaFácil"
        text = _safe(variables.get("message"), f"[{key}] Notificação da AgendaFácil")

    html = f"<p>{text}</p>"
    return {
        "subject": subject,
        "text": text,
        "html": html,
    }
