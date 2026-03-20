from __future__ import annotations

from typing import Any

from flask import current_app

try:
    import resend
except Exception:
    resend = None

from backend.notifications.models import Channel, DispatchResult, DispatchStatus, NotificationCommand


class ResendEmailAdapter:
    provider_name = "RESEND"

    def supports(self, channel: Channel) -> bool:
        return channel == Channel.EMAIL

    def health_check(self) -> bool:
        api_key = str(current_app.config.get("RESEND_API_KEY") or "").strip()
        from_address = str(current_app.config.get("EMAIL_FROM_ADDRESS") or "").strip()
        return bool(api_key and from_address and resend is not None)

    def send(self, command: NotificationCommand) -> DispatchResult:
        if command.channel != Channel.EMAIL:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code="UNSUPPORTED_CHANNEL",
                error_message="Adapter Resend suporta apenas EMAIL",
            )

        api_key = str(current_app.config.get("RESEND_API_KEY") or "").strip()
        from_address = str(current_app.config.get("EMAIL_FROM_ADDRESS") or "").strip()
        from_name = str(current_app.config.get("EMAIL_FROM_NAME") or "AgendaFácil").strip()

        if resend is None:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code="CONFIG_ERROR",
                error_message="Biblioteca 'resend' não instalada no backend",
            )

        if not api_key:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code="CONFIG_ERROR",
                error_message="RESEND_API_KEY não configurado",
            )
        if not from_address:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code="CONFIG_ERROR",
                error_message="EMAIL_FROM_ADDRESS não configurado",
            )

        subject = str((command.variables or {}).get("subject") or "Notificação AgendaFácil").strip()
        text = str((command.variables or {}).get("text") or "").strip()
        html = str((command.variables or {}).get("html") or "").strip()
        if not text and not html:
            text = f"[{command.template_key}] Notificação AgendaFácil"

        payload: dict[str, Any] = {
            "from": f"{from_name} <{from_address}>",
            "to": [str(command.to).strip()],
            "subject": subject,
        }
        if html:
            payload["html"] = html
        if text:
            payload["text"] = text

        resend.api_key = api_key

        try:
            response = resend.Emails.send(payload)
        except Exception as exc:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code="PROVIDER_ERROR",
                error_message=str(exc),
            )

        parsed: dict[str, Any]
        if isinstance(response, dict):
            parsed = response
            provider_ref = response.get("id")
        else:
            provider_ref = getattr(response, "id", None)
            parsed = {"raw": str(response)}

        return DispatchResult(
            status=DispatchStatus.SENT,
            provider_ref=str(provider_ref) if provider_ref else None,
            raw_response=parsed,
        )
