from __future__ import annotations

from datetime import datetime, timezone

from backend.notifications.models import DispatchResult, DispatchStatus, NotificationCommand
from backend.notifications.provider_resolver import ProviderResolver
from backend.repositories.notifications_repository import NotificationsRepository


class NotificationDispatcher:
    def __init__(self, resolver: ProviderResolver | None = None):
        self.resolver = resolver or ProviderResolver()

    def dispatch(self, command: NotificationCommand) -> DispatchResult:
        existing = NotificationsRepository.get_dispatch_by_idempotency(
            command.tenant_id,
            command.idempotency_key,
        )
        if existing:
            status = DispatchStatus(str(existing.get("status") or DispatchStatus.FAILED.value))
            return DispatchResult(
                status=status,
                provider_ref=existing.get("provider_ref"),
                error_code=existing.get("error_code"),
                error_message=existing.get("error_message"),
            )

        provider = self.resolver.resolve(command.tenant_id, command.channel)
        queued = NotificationsRepository.create_dispatch(
            {
                "barbearia_id": command.tenant_id,
                "channel": command.channel.value,
                "provider_name": provider.provider_name,
                "recipient": command.to,
                "template_key": command.template_key,
                "payload": command.variables,
                "idempotency_key": command.idempotency_key,
                "status": DispatchStatus.QUEUED.value,
                "attempts": 0,
                "last_attempt_at": datetime.now(tz=timezone.utc).isoformat(),
                "correlation_id": command.correlation_id,
            }
        )
        dispatch_id = str((queued or {}).get("id") or "")

        result = provider.send(command)
        attempts = 1

        if result.status == DispatchStatus.SENT:
            NotificationsRepository.update_dispatch(
                dispatch_id,
                {
                    "status": DispatchStatus.SENT.value,
                    "provider_ref": result.provider_ref,
                    "error_code": None,
                    "error_message": None,
                    "attempts": attempts,
                    "last_attempt_at": datetime.now(tz=timezone.utc).isoformat(),
                    "provider_response": result.raw_response,
                },
            )
            return result

        NotificationsRepository.update_dispatch(
            dispatch_id,
            {
                "status": DispatchStatus.FAILED.value,
                "provider_ref": result.provider_ref,
                "error_code": result.error_code,
                "error_message": result.error_message,
                "attempts": attempts,
                "last_attempt_at": datetime.now(tz=timezone.utc).isoformat(),
                "provider_response": result.raw_response,
            },
        )
        return result
