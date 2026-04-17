from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


def _is_proxy_related_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "proxy" in message or "http 407" in message or "502" in message or "503" in message


def _execute_with_proxy_retries(builder, retries: int = 3, base_delay_seconds: float = 0.35):
    last_exc = None
    safe_retries = max(1, int(retries or 1))
    for attempt in range(safe_retries):
        try:
            return builder.execute()
        except Exception as exc:
            last_exc = exc
            if attempt >= safe_retries - 1 or not _is_proxy_related_error(exc):
                raise
            time.sleep(base_delay_seconds * (attempt + 1))
    raise last_exc


class NotificationsRepository(BaseRepository):
    @staticmethod
    def get_active_provider_config(barbearia_id: str, channel: str):
        NotificationsRepository.require_tenant(barbearia_id)

        if not is_supabase_ready():
            return None

        response = (
            get_supabase_client()
            .table("notification_provider_configs")
            .select("id,barbearia_id,channel,provider_name,config,is_active")
            .eq("barbearia_id", barbearia_id)
            .eq("channel", channel)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    @staticmethod
    def upsert_active_provider_config(
        barbearia_id: str,
        channel: str,
        provider_name: str,
        config: dict[str, Any] | None = None,
    ):
        NotificationsRepository.require_tenant(barbearia_id)

        if not is_supabase_ready():
            return None

        normalized_channel = str(channel or "").upper().strip()
        normalized_provider = str(provider_name or "").upper().strip() or "EVOLUTION"
        payload = {
            "barbearia_id": barbearia_id,
            "channel": normalized_channel,
            "provider_name": normalized_provider,
            "config": config or {},
            "is_active": True,
        }

        existing = NotificationsRepository.get_active_provider_config(barbearia_id, normalized_channel)
        supabase = get_supabase_client()
        if existing and existing.get("id"):
            response = (
                supabase.table("notification_provider_configs")
                .update(payload)
                .eq("id", existing.get("id"))
                .execute()
            )
            data = response.data or []
            return data[0] if data else existing

        response = supabase.table("notification_provider_configs").insert(payload).execute()
        data = response.data or []
        return data[0] if data else None

    @staticmethod
    def get_dispatch_by_idempotency(barbearia_id: str, idempotency_key: str):
        NotificationsRepository.require_tenant(barbearia_id)
        if not idempotency_key or not is_supabase_ready():
            return None

        response = (
            get_supabase_client()
            .table("notification_dispatches")
            .select("id,status,provider_name,provider_ref,error_code,error_message")
            .eq("barbearia_id", barbearia_id)
            .eq("idempotency_key", idempotency_key)
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    @staticmethod
    def create_dispatch(payload: dict[str, Any]):
        if not is_supabase_ready():
            return None

        response = get_supabase_client().table("notification_dispatches").insert(payload).execute()
        data = response.data or []
        return data[0] if data else None

    @staticmethod
    def enqueue_dispatch(
        barbearia_id: str,
        channel: str,
        provider_name: str,
        recipient: str,
        template_key: str,
        payload: dict[str, Any],
        idempotency_key: str,
        correlation_id: str | None = None,
    ):
        NotificationsRepository.require_tenant(barbearia_id)
        if not is_supabase_ready():
            return None

        now_iso = datetime.now(tz=timezone.utc).isoformat()

        body = {
            "barbearia_id": barbearia_id,
            "channel": channel,
            "provider_name": provider_name,
            "recipient": recipient,
            "template_key": template_key,
            "payload": payload,
            "idempotency_key": idempotency_key,
            "correlation_id": correlation_id,
            "status": "QUEUED",
            "attempts": 0,
            "next_retry_at": now_iso,
            "max_attempts": 3,
            "last_attempt_at": None,
            "locked_at": None,
            "locked_by": None,
        }
        try:
            return NotificationsRepository.create_dispatch(body)
        except Exception:
            fallback = dict(body)
            fallback.pop("next_retry_at", None)
            fallback.pop("max_attempts", None)
            fallback.pop("locked_at", None)
            fallback.pop("locked_by", None)
            return NotificationsRepository.create_dispatch(fallback)

    @staticmethod
    def list_dispatches(
        barbearia_id: str,
        status: str | None = None,
        limit: int = 100,
    ):
        NotificationsRepository.require_tenant(barbearia_id)
        if not is_supabase_ready():
            return []

        safe_limit = max(1, min(int(limit or 100), 500))
        query = (
            get_supabase_client()
            .table("notification_dispatches")
            .select(
                "id,barbearia_id,channel,provider_name,recipient,template_key,payload,idempotency_key,correlation_id,status,attempts,provider_ref,error_code,error_message,last_attempt_at,next_retry_at,max_attempts,created_at,updated_at"
            )
            .eq("barbearia_id", barbearia_id)
            .order("created_at", desc=True)
            .limit(safe_limit)
        )
        if status:
            query = query.eq("status", status)

        response = query.execute()
        return response.data or []

    @staticmethod
    def get_dispatch_by_id(barbearia_id: str, dispatch_id: str):
        NotificationsRepository.require_tenant(barbearia_id)
        if not is_supabase_ready():
            return None

        response = (
            get_supabase_client()
            .table("notification_dispatches")
            .select("id,barbearia_id,status,attempts,max_attempts")
            .eq("barbearia_id", barbearia_id)
            .eq("id", dispatch_id)
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    @staticmethod
    def retry_dispatch_now(barbearia_id: str, dispatch_id: str):
        NotificationsRepository.require_tenant(barbearia_id)
        if not is_supabase_ready():
            return None

        now_iso = datetime.now(tz=timezone.utc).isoformat()
        updates = {
            "status": "RETRYING",
            "next_retry_at": now_iso,
            "locked_at": None,
            "locked_by": None,
            "error_code": None,
            "error_message": None,
        }
        try:
            return NotificationsRepository.update_dispatch(dispatch_id, updates)
        except Exception:
            fallback = dict(updates)
            fallback.pop("next_retry_at", None)
            fallback.pop("locked_at", None)
            fallback.pop("locked_by", None)
            return NotificationsRepository.update_dispatch(dispatch_id, fallback)

    @staticmethod
    def fetch_due_dispatches(limit: int = 50):
        if not is_supabase_ready():
            return []

        safe_limit = max(1, min(int(limit or 50), 200))
        now_iso = datetime.now(tz=timezone.utc).isoformat()
        supabase = get_supabase_client()

        try:
            query = (
                supabase.table("notification_dispatches")
                .select(
                    "id,barbearia_id,channel,provider_name,recipient,template_key,payload,idempotency_key,correlation_id,status,attempts,provider_ref,error_code,error_message,last_attempt_at,next_retry_at,max_attempts,locked_at,locked_by,updated_at"
                )
                .in_("status", ["QUEUED", "RETRYING"])
                .lte("next_retry_at", now_iso)
                .order("next_retry_at")
                .limit(safe_limit)
            )
            response = _execute_with_proxy_retries(query)
            return response.data or []
        except Exception:
            try:
                fallback_query = (
                    supabase.table("notification_dispatches")
                    .select(
                        "id,barbearia_id,channel,provider_name,recipient,template_key,payload,idempotency_key,correlation_id,status,attempts,provider_ref,error_code,error_message,last_attempt_at,max_attempts,updated_at"
                    )
                    .in_("status", ["QUEUED", "RETRYING"])
                    .order("created_at")
                    .limit(safe_limit)
                )
                fallback = _execute_with_proxy_retries(fallback_query)
                return fallback.data or []
            except Exception:
                return []

    @staticmethod
    def claim_dispatch(dispatch_id: str, expected_updated_at: str, worker_id: str):
        if not is_supabase_ready():
            return None

        now_iso = datetime.now(tz=timezone.utc).isoformat()
        updates = {
            "locked_at": now_iso,
            "locked_by": worker_id,
        }
        try:
            response = (
                get_supabase_client()
                .table("notification_dispatches")
                .update(updates)
                .eq("id", dispatch_id)
                .eq("updated_at", expected_updated_at)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None
        except Exception:
            response = (
                get_supabase_client()
                .table("notification_dispatches")
                .update({})
                .eq("id", dispatch_id)
                .eq("updated_at", expected_updated_at)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

    @staticmethod
    def update_dispatch(dispatch_id: str, updates: dict[str, Any]):
        if not is_supabase_ready() or not dispatch_id:
            return None

        patch = dict(updates)
        patch["updated_at"] = datetime.now(tz=timezone.utc).isoformat()

        response = (
            get_supabase_client()
            .table("notification_dispatches")
            .update(patch)
            .eq("id", dispatch_id)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None
