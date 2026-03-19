from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from backend.notifications.models import Channel, DispatchStatus, NotificationCommand
from backend.notifications.provider_resolver import ProviderResolver
from backend.notifications.template_renderer import render_whatsapp_template
from backend.repositories.notifications_repository import NotificationsRepository


BACKOFF_MINUTES = [1, 5, 15]


def _next_retry_time(attempt_number: int) -> str:
    idx = max(0, min(attempt_number - 1, len(BACKOFF_MINUTES) - 1))
    delta = timedelta(minutes=BACKOFF_MINUTES[idx])
    return (datetime.now(tz=timezone.utc) + delta).isoformat()


def _parse_channel(raw: str) -> Channel | None:
    value = str(raw or "").upper()
    if value == Channel.WHATSAPP.value:
        return Channel.WHATSAPP
    if value == Channel.EMAIL.value:
        return Channel.EMAIL
    return None


def process_due_dispatches(limit: int = 50, worker_id: str | None = None) -> dict[str, int]:
    worker = worker_id or f"worker-{uuid4()}"
    rows = NotificationsRepository.fetch_due_dispatches(limit)
    resolver = ProviderResolver()

    stats = {
        "fetched": len(rows),
        "processed": 0,
        "sent": 0,
        "retrying": 0,
        "failed": 0,
        "skipped": 0,
    }

    for row in rows:
        dispatch_id = str(row.get("id") or "")
        barbearia_id = str(row.get("barbearia_id") or "")
        expected_updated_at = str(row.get("updated_at") or "")
        if not dispatch_id or not barbearia_id or not expected_updated_at:
            stats["skipped"] += 1
            continue

        claimed = NotificationsRepository.claim_dispatch(dispatch_id, expected_updated_at, worker)
        if not claimed:
            stats["skipped"] += 1
            continue

        stats["processed"] += 1

        current_attempts = int(row.get("attempts") or 0)
        max_attempts = int(row.get("max_attempts") or 3)
        next_attempt = current_attempts + 1

        channel = _parse_channel(str(row.get("channel") or ""))
        if not channel:
            NotificationsRepository.update_dispatch(
                dispatch_id,
                {
                    "status": DispatchStatus.FAILED.value,
                    "attempts": next_attempt,
                    "error_code": "INVALID_CHANNEL",
                    "error_message": "Canal inválido para processamento",
                    "locked_at": None,
                    "locked_by": None,
                    "last_attempt_at": datetime.now(tz=timezone.utc).isoformat(),
                },
            )
            stats["failed"] += 1
            continue

        payload = dict(row.get("payload") or {})
        if channel == Channel.WHATSAPP and not payload.get("message"):
            payload["message"] = render_whatsapp_template(str(row.get("template_key") or ""), payload)

        command = NotificationCommand(
            tenant_id=barbearia_id,
            channel=channel,
            to=str(row.get("recipient") or ""),
            template_key=str(row.get("template_key") or ""),
            variables=payload,
            idempotency_key=str(row.get("idempotency_key") or ""),
            correlation_id=str(row.get("correlation_id") or "") or None,
        )

        try:
            provider = resolver.resolve(barbearia_id, channel)
            result = provider.send(command)
        except Exception as exc:
            result = None
            error_message = str(exc)
            error_code = "PROCESSING_ERROR"
        else:
            error_message = result.error_message if result else "Falha ao enviar"
            error_code = result.error_code if result else "SEND_ERROR"

        if result and result.status == DispatchStatus.SENT:
            NotificationsRepository.update_dispatch(
                dispatch_id,
                {
                    "status": DispatchStatus.SENT.value,
                    "attempts": next_attempt,
                    "provider_ref": result.provider_ref,
                    "error_code": None,
                    "error_message": None,
                    "provider_response": result.raw_response,
                    "last_attempt_at": datetime.now(tz=timezone.utc).isoformat(),
                    "locked_at": None,
                    "locked_by": None,
                },
            )
            stats["sent"] += 1
            continue

        if next_attempt >= max_attempts:
            NotificationsRepository.update_dispatch(
                dispatch_id,
                {
                    "status": DispatchStatus.FAILED.value,
                    "attempts": next_attempt,
                    "error_code": error_code,
                    "error_message": error_message,
                    "last_attempt_at": datetime.now(tz=timezone.utc).isoformat(),
                    "locked_at": None,
                    "locked_by": None,
                },
            )
            stats["failed"] += 1
            continue

        NotificationsRepository.update_dispatch(
            dispatch_id,
            {
                "status": DispatchStatus.RETRYING.value,
                "attempts": next_attempt,
                "error_code": error_code,
                "error_message": error_message,
                "next_retry_at": _next_retry_time(next_attempt),
                "last_attempt_at": datetime.now(tz=timezone.utc).isoformat(),
                "locked_at": None,
                "locked_by": None,
            },
        )
        stats["retrying"] += 1

    return stats
