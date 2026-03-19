from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any


class Channel(str, Enum):
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"


class DispatchStatus(str, Enum):
    QUEUED = "QUEUED"
    SENT = "SENT"
    FAILED = "FAILED"
    RETRYING = "RETRYING"


@dataclass(frozen=True)
class NotificationCommand:
    tenant_id: str
    channel: Channel
    to: str
    template_key: str
    variables: dict[str, Any]
    idempotency_key: str
    correlation_id: str | None = None


@dataclass(frozen=True)
class DispatchResult:
    status: DispatchStatus
    provider_ref: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    raw_response: dict[str, Any] | None = None
