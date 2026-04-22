from __future__ import annotations

import os
import re
import time
from datetime import datetime, timezone
from html import escape
from uuid import uuid4
from urllib.parse import urlparse

import requests
from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.notifications.dispatcher import NotificationDispatcher
from backend.notifications.models import Channel, NotificationCommand
from backend.repositories.barbearia_repository import BarbeariaRepository
from backend.repositories.notifications_repository import NotificationsRepository
from backend.services.master_runtime_config_service import MasterRuntimeConfigService
from backend.utils.http import error, success

notifications_bp = Blueprint("notifications", __name__)

WHATSAPP_INTEGRATION_STATUSES = {
    "DISCONNECTED",
    "CONNECTING",
    "QR_READY",
    "AWAITING_CONNECTION",
    "CONNECTED",
    "ERROR",
}


def _admin_guard():
    if str(getattr(g, "user_role", "")).upper() != "ADMIN":
        return error("Somente administradores podem testar notificações", 403)
    return None


def _evolution_headers() -> dict[str, str]:
    api_key = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_KEY", "") or "").strip()
    header_name = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_KEY_HEADER", "apikey") or "apikey").strip()
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers[header_name] = api_key
    return headers


def _evolution_proxies(base_url: str) -> dict[str, str] | None:
    http_proxy = str(MasterRuntimeConfigService.get_runtime_value("HTTP_PROXY", "") or "").strip()
    https_proxy = str(MasterRuntimeConfigService.get_runtime_value("HTTPS_PROXY", "") or "").strip()
    no_proxy = str(MasterRuntimeConfigService.get_runtime_value("NO_PROXY", "") or os.getenv("NO_PROXY") or "").strip()

    hostname = str((urlparse(base_url).hostname or "")).strip().lower()
    entries = [item.strip().lower() for item in no_proxy.split(",") if item.strip()]
    for entry in entries:
        if entry == "*":
            return None
        if entry.startswith(".") and hostname.endswith(entry):
            return None
        if hostname == entry or hostname.endswith(f".{entry}"):
            return None

    proxies: dict[str, str] = {}
    if http_proxy:
        proxies["http"] = http_proxy
    if https_proxy:
        proxies["https"] = https_proxy
    return proxies or None


def _extract_qr(parsed: dict) -> str | None:
    def _as_text(value) -> str | None:
        if isinstance(value, str):
            text = value.strip()
            return text or None
        return None

    candidates = [
        (parsed.get("qrcode") or {}).get("base64") if isinstance(parsed.get("qrcode"), dict) else None,
        (parsed.get("qrcode") or {}).get("code") if isinstance(parsed.get("qrcode"), dict) else None,
        parsed.get("qr"),
        parsed.get("base64"),
        parsed.get("qrcode") if isinstance(parsed.get("qrcode"), str) else None,
        (parsed.get("data") or {}).get("qrcode") if isinstance(parsed.get("data"), dict) else None,
        (parsed.get("data") or {}).get("base64") if isinstance(parsed.get("data"), dict) else None,
    ]
    for value in candidates:
        text = _as_text(value)
        if text:
            return text
    return None


def _sanitize_instance_name(raw: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_-]", "-", str(raw or "").strip()).strip("-")
    return base[:60] if base else ""


def _utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _normalize_integration_status(raw_value: str | None, fallback: str = "DISCONNECTED") -> str:
    normalized = str(raw_value or "").strip().upper()
    if normalized in WHATSAPP_INTEGRATION_STATUSES:
        return normalized

    safe_fallback = str(fallback or "DISCONNECTED").strip().upper()
    if safe_fallback in WHATSAPP_INTEGRATION_STATUSES:
        return safe_fallback
    return "DISCONNECTED"


def _integration_status_from_connection_status(connection_status: str | None) -> str:
    normalized = str(connection_status or "").strip().lower()
    if normalized in {"open", "connected"}:
        return "CONNECTED"
    if normalized == "connecting":
        return "CONNECTING"
    return "AWAITING_CONNECTION"


def _disconnect_evolution_instance(base_url: str, instance_name: str, timeout: int) -> tuple[bool, dict | None]:
    def _fetch_status() -> str | None:
        try:
            response = requests.get(
                f"{base_url}/instance/fetchInstances",
                headers=_evolution_headers(),
                timeout=timeout,
                proxies=_evolution_proxies(base_url),
            )
        except requests.RequestException:
            return None

        if response.status_code >= 400:
            return None

        try:
            parsed = response.json() if response.text else []
        except ValueError:
            return None

        if not isinstance(parsed, list):
            return None

        match = next(
            (item for item in parsed if str(item.get("name") or "").strip() == instance_name),
            None,
        )
        if not isinstance(match, dict):
            return "MISSING"

        status = str(match.get("connectionStatus") or "").strip()
        return status or None

    def _is_disconnected(status_value: str | None) -> bool:
        normalized = str(status_value or "").strip().lower()
        if normalized == "missing":
            return True
        if not normalized:
            return False
        if normalized in {"close", "closed", "disconnected", "logout", "logoff", "offline"}:
            return True
        return normalized not in {"open", "connected", "connecting"}

    candidates: list[tuple[str, str, dict | None]] = [
        ("POST", f"{base_url}/instance/logout/{instance_name}", None),
        ("DELETE", f"{base_url}/instance/logout/{instance_name}", None),
        ("POST", f"{base_url}/instance/logout", {"instanceName": instance_name}),
        ("DELETE", f"{base_url}/instance/logout", {"instanceName": instance_name}),
        ("POST", f"{base_url}/instance/logout?instanceName={instance_name}", None),
        ("DELETE", f"{base_url}/instance/logout?instanceName={instance_name}", None),
        ("POST", f"{base_url}/instance/disconnect/{instance_name}", None),
        ("DELETE", f"{base_url}/instance/disconnect/{instance_name}", None),
        ("POST", f"{base_url}/instance/disconnect", {"instanceName": instance_name}),
        ("DELETE", f"{base_url}/instance/disconnect", {"instanceName": instance_name}),
    ]

    last_response: dict | None = None
    attempt_logs: list[dict] = []
    for method, url, body in candidates:
        try:
            response = requests.request(
                method,
                url,
                json=body,
                headers=_evolution_headers(),
                timeout=timeout,
                proxies=_evolution_proxies(base_url),
            )
        except requests.RequestException as exc:
            attempt_logs.append(
                {
                    "method": method,
                    "url": url,
                    "status": None,
                    "body": {"error": str(exc)},
                }
            )
            continue

        try:
            parsed = response.json() if response.text else {}
        except ValueError:
            parsed = {"raw": response.text}

        attempt_entry = {
            "method": method,
            "url": url,
            "status": response.status_code,
            "body": parsed,
        }
        last_response = dict(attempt_entry)
        attempt_logs.append(attempt_entry)

        provider_message_blob = " ".join(
            [
                str(parsed.get("message") or "") if isinstance(parsed, dict) else "",
                str(parsed.get("error") or "") if isinstance(parsed, dict) else "",
                str(parsed),
            ]
        ).lower()

        if response.status_code >= 400 and any(
            token in provider_message_blob
            for token in ["server disconnected", "already disconnected", "not connected", "connection closed"]
        ):
            last_response["verified_connection_status"] = "PROVIDER_ALREADY_DISCONNECTED"
            last_response["attempts"] = [dict(item) for item in attempt_logs]
            return True, last_response

        if response.status_code < 400:
            observed_statuses: list[str | None] = []
            consecutive_disconnected = 0

            for _ in range(15):
                current_status = _fetch_status()
                observed_statuses.append(current_status)

                if _is_disconnected(current_status):
                    consecutive_disconnected += 1
                else:
                    consecutive_disconnected = 0

                if consecutive_disconnected >= 3:
                    last_response["verified_connection_status"] = current_status
                    last_response["verification_samples"] = observed_statuses
                    last_response["attempts"] = [dict(item) for item in attempt_logs]
                    return True, last_response

                time.sleep(1)

            last_response["verified_connection_status"] = observed_statuses[-1] if observed_statuses else None
            last_response["verification_samples"] = observed_statuses

    if last_response is not None:
        last_response["attempts"] = [dict(item) for item in attempt_logs]
    return False, last_response


def _delete_evolution_instance(base_url: str, instance_name: str, timeout: int) -> tuple[bool, dict | None]:
    def _is_missing() -> bool:
        try:
            response = requests.get(
                f"{base_url}/instance/fetchInstances",
                headers=_evolution_headers(),
                timeout=timeout,
                proxies=_evolution_proxies(base_url),
            )
        except requests.RequestException:
            return False

        if response.status_code >= 400:
            return False

        try:
            parsed = response.json() if response.text else []
        except ValueError:
            return False

        if not isinstance(parsed, list):
            return False

        match = next(
            (item for item in parsed if str(item.get("name") or "").strip() == instance_name),
            None,
        )
        return not isinstance(match, dict)

    candidates: list[tuple[str, str, dict | None]] = [
        ("DELETE", f"{base_url}/instance/delete/{instance_name}", None),
        ("POST", f"{base_url}/instance/delete/{instance_name}", None),
        ("DELETE", f"{base_url}/instance/deleteInstance/{instance_name}", None),
        ("POST", f"{base_url}/instance/deleteInstance/{instance_name}", None),
        ("POST", f"{base_url}/instance/delete", {"instanceName": instance_name}),
        ("DELETE", f"{base_url}/instance/delete", {"instanceName": instance_name}),
        ("POST", f"{base_url}/instance/delete?instanceName={instance_name}", None),
        ("DELETE", f"{base_url}/instance/delete?instanceName={instance_name}", None),
    ]

    last_response: dict | None = None
    attempt_logs: list[dict] = []
    for method, url, body in candidates:
        try:
            response = requests.request(
                method,
                url,
                json=body,
                headers=_evolution_headers(),
                timeout=timeout,
                proxies=_evolution_proxies(base_url),
            )
        except requests.RequestException as exc:
            attempt_logs.append(
                {
                    "method": method,
                    "url": url,
                    "status": None,
                    "body": {"error": str(exc)},
                }
            )
            continue

        try:
            parsed = response.json() if response.text else {}
        except ValueError:
            parsed = {"raw": response.text}

        attempt_entry = {
            "method": method,
            "url": url,
            "status": response.status_code,
            "body": parsed,
        }
        last_response = dict(attempt_entry)
        attempt_logs.append(attempt_entry)

        if response.status_code < 400:
            for _ in range(10):
                if _is_missing():
                    last_response["verified_missing"] = True
                    last_response["attempts"] = [dict(item) for item in attempt_logs]
                    return True, last_response
                time.sleep(1)

    if _is_missing():
        if last_response is None:
            last_response = {
                "method": "VERIFY",
                "url": f"{base_url}/instance/fetchInstances",
                "status": 200,
                "body": {"message": "Instância ausente após verificação final."},
            }
        last_response["verified_missing"] = True
        last_response["attempts"] = [dict(item) for item in attempt_logs]
        return True, last_response

    if last_response is not None:
        last_response["attempts"] = [dict(item) for item in attempt_logs]
    return False, last_response


def _evolution_connect_existing_instance(base_url: str, instance_name: str, timeout: int) -> tuple[bool, dict | None]:
    candidates: list[tuple[str, str]] = [
        ("GET", f"{base_url}/instance/connect/{instance_name}"),
        ("POST", f"{base_url}/instance/restart/{instance_name}"),
    ]

    last_response: dict | None = None
    for method, url in candidates:
        try:
            response = requests.request(
                method,
                url,
                headers=_evolution_headers(),
                timeout=timeout,
                proxies=_evolution_proxies(base_url),
            )
        except requests.RequestException:
            continue

        try:
            parsed = response.json() if response.text else {}
        except ValueError:
            parsed = {"raw": response.text}

        last_response = {
            "method": method,
            "url": url,
            "status": response.status_code,
            "body": parsed,
        }

        if response.status_code < 400:
            return True, last_response

    return False, last_response


def _channel_alerts_enabled(row: dict | None, default: bool = True) -> bool:
    config = (row or {}).get("config") or {}
    if isinstance(config, dict) and "alerts_enabled" in config:
        return bool(config.get("alerts_enabled"))
    return default


@notifications_bp.get("/internal/notifications/whatsapp/evolution/state")
@auth_required
def get_evolution_instance_state_for_tenant():
    denied = _admin_guard()
    if denied:
        return denied

    tenant_id = str(getattr(g, "barbearia_id", ""))
    config_row = NotificationsRepository.get_active_provider_config(tenant_id, Channel.WHATSAPP.value) or {}
    cfg = dict(config_row.get("config") or {})
    instance_name = str(cfg.get("instance") or "").strip() or None
    persisted_status = _normalize_integration_status(cfg.get("integration_status"), "DISCONNECTED")
    last_sync_at = cfg.get("last_sync_at")
    last_error = str(cfg.get("last_error") or "").strip() or None

    if not instance_name:
        if persisted_status != "DISCONNECTED" or last_error:
            cfg["integration_status"] = "DISCONNECTED"
            cfg["last_sync_at"] = _utc_now_iso()
            cfg["last_error"] = None
            NotificationsRepository.upsert_active_provider_config(
                barbearia_id=tenant_id,
                channel=Channel.WHATSAPP.value,
                provider_name=str(config_row.get("provider_name") or "EVOLUTION"),
                config=cfg,
            )
        return success(
            {
                "has_integration": False,
                "instance_name": None,
                "is_connected": False,
                "connection_status": None,
                "integration_status": "DISCONNECTED",
                "last_sync_at": cfg.get("last_sync_at") or _utc_now_iso(),
                "last_error": None,
            }
        )

    base_url = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_BASE_URL", "") or "").strip().rstrip("/")
    if not base_url:
        return success(
            {
                "has_integration": True,
                "instance_name": instance_name,
                "is_connected": False,
                "connection_status": None,
                "integration_status": persisted_status if persisted_status != "DISCONNECTED" else "AWAITING_CONNECTION",
                "last_sync_at": last_sync_at,
                "last_error": last_error,
            }
        )

    timeout = int(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_HTTP_TIMEOUT_SECONDS", 15) or 15)
    connection_status = None
    sync_error = None
    try:
        response = requests.get(
            f"{base_url}/instance/fetchInstances",
            headers=_evolution_headers(),
            timeout=timeout,
            proxies=_evolution_proxies(base_url),
        )
        if response.status_code < 400:
            parsed = response.json() if response.text else []
            if isinstance(parsed, list):
                match = next(
                    (item for item in parsed if str(item.get("name") or "").strip() == instance_name),
                    None,
                )
                if isinstance(match, dict):
                    connection_status = str(match.get("connectionStatus") or "").strip() or None
                else:
                    sync_error = "Instância não encontrada na Evolution"
            else:
                sync_error = "Formato inválido de resposta da Evolution"
        else:
            sync_error = f"HTTP_{response.status_code}"
    except (requests.RequestException, ValueError):
        connection_status = None
        sync_error = "Falha ao consultar estado da Evolution"

    if sync_error == "Instância não encontrada na Evolution":
        cfg.pop("instance", None)
        cfg["integration_status"] = "DISCONNECTED"
        cfg["last_sync_at"] = _utc_now_iso()
        cfg["last_error"] = None
        NotificationsRepository.upsert_active_provider_config(
            barbearia_id=tenant_id,
            channel=Channel.WHATSAPP.value,
            provider_name=str(config_row.get("provider_name") or "EVOLUTION"),
            config=cfg,
        )
        return success(
            {
                "has_integration": False,
                "instance_name": None,
                "is_connected": False,
                "connection_status": None,
                "integration_status": "DISCONNECTED",
                "last_sync_at": cfg.get("last_sync_at") or _utc_now_iso(),
                "last_error": None,
            }
        )

    integration_status = _integration_status_from_connection_status(connection_status)
    is_connected = integration_status == "CONNECTED"
    new_last_sync = _utc_now_iso()
    cfg["integration_status"] = _normalize_integration_status(integration_status, "AWAITING_CONNECTION")
    cfg["last_sync_at"] = new_last_sync
    cfg["last_error"] = sync_error
    NotificationsRepository.upsert_active_provider_config(
        barbearia_id=tenant_id,
        channel=Channel.WHATSAPP.value,
        provider_name=str(config_row.get("provider_name") or "EVOLUTION"),
        config=cfg,
    )

    return success(
        {
            "has_integration": True,
            "instance_name": instance_name,
            "is_connected": is_connected,
            "connection_status": connection_status,
            "integration_status": integration_status,
            "last_sync_at": new_last_sync,
            "last_error": sync_error,
        }
    )


@notifications_bp.get("/internal/notifications/channels/settings")
@auth_required
def get_notification_channels_settings():
    denied = _admin_guard()
    if denied:
        return denied

    tenant_id = str(getattr(g, "barbearia_id", ""))
    whatsapp_row = NotificationsRepository.get_active_provider_config(tenant_id, Channel.WHATSAPP.value)
    email_row = NotificationsRepository.get_active_provider_config(tenant_id, Channel.EMAIL.value)

    return success(
        {
            "whatsapp_enabled": _channel_alerts_enabled(whatsapp_row, True),
            "email_enabled": _channel_alerts_enabled(email_row, True),
        }
    )


@notifications_bp.put("/internal/notifications/channels/settings")
@auth_required
def update_notification_channels_settings():
    denied = _admin_guard()
    if denied:
        return denied

    payload = request.get_json(silent=True) or {}
    has_whatsapp = "whatsapp_enabled" in payload
    has_email = "email_enabled" in payload
    if not has_whatsapp and not has_email:
        return error("Informe ao menos um canal para atualizar", 400)

    if has_whatsapp and not isinstance(payload.get("whatsapp_enabled"), bool):
        return error("Campo 'whatsapp_enabled' deve ser booleano", 400)
    if has_email and not isinstance(payload.get("email_enabled"), bool):
        return error("Campo 'email_enabled' deve ser booleano", 400)

    tenant_id = str(getattr(g, "barbearia_id", ""))

    if has_whatsapp:
        existing = NotificationsRepository.get_active_provider_config(tenant_id, Channel.WHATSAPP.value) or {}
        merged_cfg = dict(existing.get("config") or {})
        merged_cfg["alerts_enabled"] = bool(payload.get("whatsapp_enabled"))
        NotificationsRepository.upsert_active_provider_config(
            barbearia_id=tenant_id,
            channel=Channel.WHATSAPP.value,
            provider_name=str(existing.get("provider_name") or "EVOLUTION"),
            config=merged_cfg,
        )

    if has_email:
        existing = NotificationsRepository.get_active_provider_config(tenant_id, Channel.EMAIL.value) or {}
        merged_cfg = dict(existing.get("config") or {})
        merged_cfg["alerts_enabled"] = bool(payload.get("email_enabled"))
        NotificationsRepository.upsert_active_provider_config(
            barbearia_id=tenant_id,
            channel=Channel.EMAIL.value,
            provider_name=str(existing.get("provider_name") or "RESEND"),
            config=merged_cfg,
        )

    whatsapp_row = NotificationsRepository.get_active_provider_config(tenant_id, Channel.WHATSAPP.value)
    email_row = NotificationsRepository.get_active_provider_config(tenant_id, Channel.EMAIL.value)
    return success(
        {
            "whatsapp_enabled": _channel_alerts_enabled(whatsapp_row, True),
            "email_enabled": _channel_alerts_enabled(email_row, True),
        }
    )


@notifications_bp.post("/internal/notifications/whatsapp/evolution/instance")
@auth_required
def create_evolution_instance_for_tenant():
    denied = _admin_guard()
    if denied:
        return denied

    payload = request.get_json(silent=True) or {}
    base_url = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_BASE_URL", "") or "").strip().rstrip("/")
    if not base_url:
        return error("EVOLUTION_API_BASE_URL não configurado", 400)

    tenant_slug = str(getattr(g, "barbearia_slug", "tenant")).strip().lower() or "tenant"
    suggested = _sanitize_instance_name(str(payload.get("instance_name") or ""))
    instance_name = suggested or _sanitize_instance_name(f"agf-{tenant_slug}-{str(uuid4())[:8]}")

    request_body = {
        "instanceName": instance_name,
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS",
    }
    timeout = int(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_HTTP_TIMEOUT_SECONDS", 15) or 15)

    try:
        response = requests.post(
            f"{base_url}/instance/create",
            json=request_body,
            headers=_evolution_headers(),
            timeout=timeout,
            proxies=_evolution_proxies(base_url),
        )
    except requests.RequestException as exc:
        return error(f"Falha ao criar instância na Evolution: {exc}", 502)

    try:
        parsed = response.json() if response.text else {}
    except ValueError:
        parsed = {"raw": response.text}

    if response.status_code >= 400:
        message = str(parsed.get("message") or parsed.get("error") or f"HTTP_{response.status_code}")

        provider_message_blob = " ".join(
            [
                message,
                str((parsed.get("response") or {}).get("message") or ""),
                str(parsed),
            ]
        ).lower()
        is_name_in_use = response.status_code == 403 and "already in use" in provider_message_blob

        if is_name_in_use:
            reconnected, reconnect_response = _evolution_connect_existing_instance(base_url, instance_name, timeout)
            if reconnected:
                reconnect_body = dict((reconnect_response or {}).get("body") or {})
                tenant_id = str(getattr(g, "barbearia_id", ""))
                existing_whatsapp_cfg = NotificationsRepository.get_active_provider_config(tenant_id, Channel.WHATSAPP.value) or {}
                merged_whatsapp_cfg = dict(existing_whatsapp_cfg.get("config") or {})
                merged_whatsapp_cfg["instance"] = instance_name
                qr_code = _extract_qr(reconnect_body)
                merged_whatsapp_cfg["integration_status"] = _normalize_integration_status("QR_READY" if qr_code else "AWAITING_CONNECTION", "AWAITING_CONNECTION")
                merged_whatsapp_cfg["last_sync_at"] = _utc_now_iso()
                merged_whatsapp_cfg["last_error"] = None

                saved = NotificationsRepository.upsert_active_provider_config(
                    barbearia_id=tenant_id,
                    channel=Channel.WHATSAPP.value,
                    provider_name=str(existing_whatsapp_cfg.get("provider_name") or "EVOLUTION"),
                    config=merged_whatsapp_cfg,
                )

                return success(
                    {
                        "instance_name": instance_name,
                        "qr_code": qr_code,
                        "provider_response": reconnect_body,
                        "provider_config_id": (saved or {}).get("id"),
                        "integration_status": merged_whatsapp_cfg.get("integration_status"),
                        "last_sync_at": merged_whatsapp_cfg.get("last_sync_at"),
                        "reused_existing_instance": True,
                    }
                )

        return error(message, 422, details={"provider_response": parsed, "instance_name": instance_name})

    tenant_id = str(getattr(g, "barbearia_id", ""))
    existing_whatsapp_cfg = NotificationsRepository.get_active_provider_config(tenant_id, Channel.WHATSAPP.value) or {}
    merged_whatsapp_cfg = dict(existing_whatsapp_cfg.get("config") or {})
    merged_whatsapp_cfg["instance"] = instance_name
    merged_whatsapp_cfg["integration_status"] = _normalize_integration_status("CONNECTING", "CONNECTING")
    merged_whatsapp_cfg["last_sync_at"] = _utc_now_iso()
    merged_whatsapp_cfg["last_error"] = None

    saved = NotificationsRepository.upsert_active_provider_config(
        barbearia_id=tenant_id,
        channel=Channel.WHATSAPP.value,
        provider_name=str(existing_whatsapp_cfg.get("provider_name") or "EVOLUTION"),
        config=merged_whatsapp_cfg,
    )

    qr_code = _extract_qr(parsed)
    merged_whatsapp_cfg["integration_status"] = _normalize_integration_status("QR_READY" if qr_code else "AWAITING_CONNECTION", "AWAITING_CONNECTION")
    merged_whatsapp_cfg["last_sync_at"] = _utc_now_iso()
    merged_whatsapp_cfg["last_error"] = None
    saved = NotificationsRepository.upsert_active_provider_config(
        barbearia_id=tenant_id,
        channel=Channel.WHATSAPP.value,
        provider_name=str(existing_whatsapp_cfg.get("provider_name") or "EVOLUTION"),
        config=merged_whatsapp_cfg,
    )

    return success(
        {
            "instance_name": instance_name,
            "qr_code": qr_code,
            "provider_response": parsed,
            "provider_config_id": (saved or {}).get("id"),
            "integration_status": merged_whatsapp_cfg.get("integration_status"),
            "last_sync_at": merged_whatsapp_cfg.get("last_sync_at"),
        }
    )


@notifications_bp.post("/internal/notifications/whatsapp/evolution/disconnect")
@auth_required
def disconnect_evolution_instance_for_tenant():
    denied = _admin_guard()
    if denied:
        return denied

    tenant_id = str(getattr(g, "barbearia_id", ""))
    config_row = NotificationsRepository.get_active_provider_config(tenant_id, Channel.WHATSAPP.value) or {}
    cfg = dict(config_row.get("config") or {})
    instance_name = str(cfg.get("instance") or "").strip()

    if not instance_name:
        cfg["integration_status"] = "DISCONNECTED"
        cfg["last_sync_at"] = _utc_now_iso()
        cfg["last_error"] = None
        saved = NotificationsRepository.upsert_active_provider_config(
            barbearia_id=tenant_id,
            channel=Channel.WHATSAPP.value,
            provider_name=str(config_row.get("provider_name") or "EVOLUTION"),
            config=cfg,
        )
        return success(
            {
                "disconnected": True,
                "instance_name": None,
                "provider_response": None,
                "provider_config_id": (saved or {}).get("id") or config_row.get("id"),
                "message": "Nenhuma instância configurada para este tenant.",
            }
        )

    base_url = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_BASE_URL", "") or "").strip().rstrip("/")
    timeout = int(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_HTTP_TIMEOUT_SECONDS", 15) or 15)

    provider_response = None
    disconnected = False
    deleted = False
    disconnect_response = None
    delete_response = None
    if base_url:
        disconnected, disconnect_response = _disconnect_evolution_instance(base_url, instance_name, timeout)
        deleted, delete_response = _delete_evolution_instance(base_url, instance_name, timeout)
        provider_response = {
            "disconnect": disconnect_response,
            "delete": delete_response,
        }

    if not deleted:
        cfg["integration_status"] = "ERROR"
        cfg["last_sync_at"] = _utc_now_iso()
        cfg["last_error"] = "Falha ao remover a instância na Evolution"
        NotificationsRepository.upsert_active_provider_config(
            barbearia_id=tenant_id,
            channel=Channel.WHATSAPP.value,
            provider_name=str(config_row.get("provider_name") or "EVOLUTION"),
            config=cfg,
        )
        return error(
            "Não foi possível remover a instância na Evolution.",
            422,
            details={
                "instance_name": instance_name,
                "disconnected": disconnected,
                "deleted": deleted,
                "provider_response": provider_response,
            },
        )

    cfg.pop("instance", None)
    cfg["integration_status"] = "DISCONNECTED"
    cfg["last_sync_at"] = _utc_now_iso()
    cfg["last_error"] = None
    saved = NotificationsRepository.upsert_active_provider_config(
        barbearia_id=tenant_id,
        channel=Channel.WHATSAPP.value,
        provider_name=str(config_row.get("provider_name") or "EVOLUTION"),
        config=cfg,
    )

    return success(
        {
            "disconnected": True,
            "deleted": True,
            "instance_name": instance_name,
            "provider_response": provider_response,
            "provider_config_id": (saved or {}).get("id"),
        }
    )


@notifications_bp.post("/internal/notifications/test-whatsapp")
@auth_required
def test_whatsapp_notification():
    denied = _admin_guard()
    if denied:
        return denied

    payload = request.get_json(silent=True) or {}
    phone = str(payload.get("to") or "").strip()
    if not phone:
        return error("Campo 'to' é obrigatório", 400)

    variables = payload.get("variables")
    if variables is None:
        variables = {}
    if not isinstance(variables, dict):
        return error("Campo 'variables' deve ser um objeto", 400)

    template_key = str(payload.get("template_key") or "TEST_NOTIFICATION").strip() or "TEST_NOTIFICATION"
    idempotency_key = str(payload.get("idempotency_key") or "").strip() or str(uuid4())
    correlation_id = str(payload.get("correlation_id") or "").strip() or None
    tenant_id = str(getattr(g, "barbearia_id", ""))
    existing = NotificationsRepository.get_dispatch_by_idempotency(tenant_id, idempotency_key)
    if existing:
        return success(
            {
                "status": str(existing.get("status") or "FAILED"),
                "dispatch_id": existing.get("id"),
                "provider_ref": existing.get("provider_ref"),
                "error_code": existing.get("error_code"),
                "error_message": existing.get("error_message"),
                "idempotency_key": idempotency_key,
                "mode": "async",
            },
            200,
        )

    config = NotificationsRepository.get_active_provider_config(tenant_id, Channel.WHATSAPP.value) or {}
    provider_name = str(config.get("provider_name") or "EVOLUTION").upper()

    queued = NotificationsRepository.enqueue_dispatch(
        barbearia_id=tenant_id,
        channel=Channel.WHATSAPP.value,
        provider_name=provider_name,
        recipient=phone,
        template_key=template_key,
        payload=variables,
        idempotency_key=idempotency_key,
        correlation_id=correlation_id,
    )

    if not queued:
        return error("Não foi possível enfileirar notificação", 500)

    return success(
        {
            "status": "QUEUED",
            "dispatch_id": queued.get("id"),
            "idempotency_key": idempotency_key,
            "provider_name": provider_name,
            "mode": "async",
        },
        202,
    )


@notifications_bp.get("/internal/notifications/dispatches")
@auth_required
def list_dispatches():
    denied = _admin_guard()
    if denied:
        return denied

    status = str(request.args.get("status") or "").strip().upper() or None
    raw_limit = request.args.get("limit") or "100"
    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return error("limit inválido", 400)

    if status and status not in {"QUEUED", "SENT", "FAILED", "RETRYING"}:
        return error("status inválido", 400)

    rows = NotificationsRepository.list_dispatches(
        str(getattr(g, "barbearia_id", "")),
        status=status,
        limit=limit,
    )
    return success(rows)


@notifications_bp.post("/internal/notifications/test-email")
@auth_required
def test_email_notification():
    denied = _admin_guard()
    if denied:
        return denied

    payload = request.get_json(silent=True) or {}
    recipient = str(payload.get("to") or "").strip()
    if not recipient:
        return error("Campo 'to' é obrigatório", 400)

    variables = payload.get("variables")
    if variables is None:
        variables = {}
    if not isinstance(variables, dict):
        return error("Campo 'variables' deve ser um objeto", 400)

    template_key = str(payload.get("template_key") or "TEST_NOTIFICATION").strip() or "TEST_NOTIFICATION"
    idempotency_key = str(payload.get("idempotency_key") or "").strip() or str(uuid4())
    correlation_id = str(payload.get("correlation_id") or "").strip() or None

    command = NotificationCommand(
        tenant_id=str(getattr(g, "barbearia_id", "")),
        channel=Channel.EMAIL,
        to=recipient,
        template_key=template_key,
        variables=variables,
        idempotency_key=idempotency_key,
        correlation_id=correlation_id,
    )

    result = NotificationDispatcher().dispatch(command)

    status_code = 200 if result.status.value in {"QUEUED", "SENT"} else 502
    return success(
        {
            "status": result.status.value,
            "provider_ref": result.provider_ref,
            "error_code": result.error_code,
            "error_message": result.error_message,
            "idempotency_key": idempotency_key,
        },
        status_code,
    )


@notifications_bp.post("/internal/notifications/support/contact")
@auth_required
def send_support_contact_email():
    denied = _admin_guard()
    if denied:
        return denied

    payload = request.get_json(silent=True) or {}
    tenant_id = str(getattr(g, "barbearia_id", "") or "")
    tenant_slug = str(getattr(g, "barbearia_slug", "") or "")

    contact_name = str(payload.get("contact_name") or "").strip()
    message_text = str(payload.get("message") or "").strip()

    if not contact_name:
        return error("Campo 'contact_name' é obrigatório", 400)
    if len(contact_name) > 120:
        return error("Campo 'contact_name' deve ter no máximo 120 caracteres", 400)

    if not message_text:
        return error("Campo 'message' é obrigatório", 400)
    if len(message_text) > 6000:
        return error("Campo 'message' deve ter no máximo 6000 caracteres", 400)

    identity = BarbeariaRepository.get_identity(tenant_id) or {}
    subscription = BarbeariaRepository.get_subscription(tenant_id) or {}
    barbearia_name = str(identity.get("nome") or "Barbearia sem nome").strip() or "Barbearia sem nome"

    sent_at = datetime.now(tz=timezone.utc).isoformat()
    support_recipient = "suporte@barbeiros.app"

    metadata = {
        "barbearia.id": tenant_id or None,
        "barbearia.slug": tenant_slug or identity.get("slug"),
        "barbearia.nome": barbearia_name,
        "barbearia.telefone": identity.get("telefone"),
        "barbearia.cidade": identity.get("cidade"),
        "barbearia.icone_marca": identity.get("icone_marca"),
        "barbearia.cor_primaria": identity.get("cor_primaria"),
        "barbearia.cor_secundaria": identity.get("cor_secundaria"),
        "barbearia.logo_url": identity.get("logo_url"),
        "barbearia.login_logo_url": identity.get("login_logo_url"),
        "barbearia.login_background_url": identity.get("login_background_url"),
        "barbearia.churn_risk_days_threshold": identity.get("churn_risk_days_threshold"),
        "barbearia.allow_employee_confirm_appointment": identity.get("allow_employee_confirm_appointment"),
        "barbearia.allow_employee_create_appointment": identity.get("allow_employee_create_appointment"),
        "barbearia.allow_employee_view_finance": identity.get("allow_employee_view_finance"),
        "barbearia.allow_employee_view_reports": identity.get("allow_employee_view_reports"),
        "barbearia.allow_employee_view_users": identity.get("allow_employee_view_users"),
        "assinatura.plano": subscription.get("plano"),
        "assinatura.status": subscription.get("assinatura_status"),
        "assinatura.status_efetivo": subscription.get("assinatura_status_efetivo"),
        "assinatura.ciclo_cobranca": subscription.get("ciclo_cobranca"),
        "assinatura.valor_plano_centavos": subscription.get("valor_plano_centavos"),
        "assinatura.trial_usado": subscription.get("trial_usado"),
        "assinatura.trial_inicio_em": subscription.get("trial_inicio_em"),
        "assinatura.trial_fim_em": subscription.get("trial_fim_em"),
        "assinatura.dias_restantes_trial": subscription.get("dias_restantes_trial"),
        "assinatura.assinatura_inicio_em": subscription.get("assinatura_inicio_em"),
        "assinatura.proxima_cobranca_em": subscription.get("proxima_cobranca_em"),
        "assinatura.atualizado_assinatura_em": subscription.get("atualizado_assinatura_em"),
        "payment.customer_id": subscription.get("payment_customer_id"),
        "payment.subscription_id": subscription.get("payment_subscription_id"),
        "payment.plan_id": subscription.get("payment_plan_id"),
        "payment.last_event_id": subscription.get("payment_last_event_id"),
        "payment.last_event_type": subscription.get("payment_last_event_type"),
        "payment.last_event_at": subscription.get("payment_last_event_at"),
        "payment.webhook_updated_at": subscription.get("payment_webhook_updated_at"),
        "solicitante.nome": contact_name,
        "solicitante.user_id": str(getattr(g, "user_id", "") or "") or None,
        "solicitante.role": str(getattr(g, "user_role", "") or "") or None,
        "solicitante.telefone": str(getattr(g, "user_phone", "") or "") or None,
        "solicitante.email": str(getattr(g, "user_email", "") or "") or None,
        "origem.timestamp_utc": sent_at,
        "origem.user_agent": str(request.headers.get("User-Agent") or "").strip() or None,
        "origem.ip": str(request.headers.get("X-Forwarded-For") or request.remote_addr or "").strip() or None,
    }

    metadata_lines = []
    html_metadata_lines = []
    for key, value in metadata.items():
        normalized = "" if value is None else str(value).strip()
        printable = normalized or "-"
        metadata_lines.append(f"- {key}: {printable}")
        html_metadata_lines.append(f"<li><strong>{escape(key)}:</strong> {escape(printable)}</li>")

    subject = f"[Suporte AgendaFácil] {barbearia_name} | {contact_name}"

    text_body = "\n".join(
        [
            "Nova mensagem de suporte enviada pelo painel Fale Conosco.",
            "",
            f"Barbearia: {barbearia_name}",
            f"Solicitante: {contact_name}",
            "",
            "Mensagem:",
            message_text,
            "",
            "Dados completos da barbearia e contexto:",
            *metadata_lines,
        ]
    )

    html_message = "<br/>".join(escape(line) for line in message_text.splitlines())
    html_body = (
        "<div style=\"font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;\">"
        "<h2 style=\"margin:0 0 12px;\">Nova mensagem de suporte</h2>"
        f"<p style=\"margin:0 0 8px;\"><strong>Barbearia:</strong> {escape(barbearia_name)}</p>"
        f"<p style=\"margin:0 0 16px;\"><strong>Solicitante:</strong> {escape(contact_name)}</p>"
        "<h3 style=\"margin:0 0 8px;\">Mensagem</h3>"
        f"<p style=\"white-space:pre-wrap;margin:0 0 16px;\">{html_message}</p>"
        "<h3 style=\"margin:0 0 8px;\">Dados completos da barbearia e contexto</h3>"
        f"<ul style=\"padding-left:18px;margin:0;\">{''.join(html_metadata_lines)}</ul>"
        "</div>"
    )

    idempotency_key = str(uuid4())
    command = NotificationCommand(
        tenant_id=tenant_id,
        channel=Channel.EMAIL,
        to=support_recipient,
        template_key="SUPPORT_CONTACT",
        variables={
            "subject": subject,
            "text": text_body,
            "html": html_body,
        },
        idempotency_key=idempotency_key,
        correlation_id="support-contact",
    )

    result = NotificationDispatcher().dispatch(command)
    if result.status.value not in {"SENT", "QUEUED"}:
        return error(
            result.error_message or "Falha ao enviar mensagem para o suporte",
            502,
            details={"error_code": result.error_code},
        )

    return success(
        {
            "status": result.status.value,
            "provider_ref": result.provider_ref,
            "idempotency_key": idempotency_key,
            "to": support_recipient,
        },
        200,
    )


@notifications_bp.post("/internal/notifications/dispatches/<dispatch_id>/retry")
@auth_required
def retry_dispatch(dispatch_id: str):
    denied = _admin_guard()
    if denied:
        return denied

    barbearia_id = str(getattr(g, "barbearia_id", ""))
    existing = NotificationsRepository.get_dispatch_by_id(barbearia_id, dispatch_id)
    if not existing:
        return error("Dispatch não encontrado", 404)

    updated = NotificationsRepository.retry_dispatch_now(barbearia_id, dispatch_id)
    if not updated:
        return error("Não foi possível reagendar o dispatch", 500)

    return success({"id": dispatch_id, "status": "RETRYING"})
