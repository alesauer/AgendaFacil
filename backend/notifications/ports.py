from __future__ import annotations

from typing import Protocol

from backend.notifications.models import Channel, DispatchResult, NotificationCommand


class NotificationProviderPort(Protocol):
    provider_name: str

    def supports(self, channel: Channel) -> bool:
        ...

    def send(self, command: NotificationCommand) -> DispatchResult:
        ...

    def health_check(self) -> bool:
        ...
