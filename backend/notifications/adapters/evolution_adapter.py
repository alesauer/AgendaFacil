from __future__ import annotations

import os
from typing import Any
from urllib.parse import urlparse

import requests
from flask import current_app

from backend.notifications.models import Channel, DispatchResult, DispatchStatus, NotificationCommand
from backend.repositories.notifications_repository import NotificationsRepository
from backend.services.master_runtime_config_service import MasterRuntimeConfigService


class EvolutionWhatsAppAdapter:
    provider_name = "EVOLUTION"

    def supports(self, channel: Channel) -> bool:
        return channel == Channel.WHATSAPP

    def _tenant_provider_config(self, tenant_id: str) -> dict[str, Any]:
        if not tenant_id:
            return {}
        config_row = NotificationsRepository.get_active_provider_config(tenant_id, Channel.WHATSAPP.value) or {}
        config = config_row.get("config")
        return config if isinstance(config, dict) else {}

    @staticmethod
    def _effective_value(provider_config: dict[str, Any], key: str, env_key: str, default: str = "") -> str:
        preferred = str(provider_config.get(key) or "").strip()
        if preferred:
            return preferred
        return str(MasterRuntimeConfigService.get_runtime_value(env_key, default) or default).strip()

    def health_check(self) -> bool:
        base_url = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_BASE_URL", "") or "").strip()
        instance = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_INSTANCE", "") or "").strip()
        return bool(base_url and instance)

    def _build_url(self, provider_config: dict[str, Any]) -> str:
        base_url = self._effective_value(provider_config, "base_url", "EVOLUTION_API_BASE_URL", "").rstrip("/")
        instance = self._effective_value(provider_config, "instance", "EVOLUTION_INSTANCE", "")
        send_path = self._effective_value(provider_config, "send_path", "EVOLUTION_SEND_TEXT_PATH", "")

        if not base_url or not instance:
            raise RuntimeError("EVOLUTION_API_BASE_URL/EVOLUTION_INSTANCE não configurados")

        if not send_path:
            send_path = "/message/sendText/{instance}"

        path = send_path.replace("{instance}", instance)
        return f"{base_url}{path}"

    def _render_message(self, command: NotificationCommand) -> str:
        variables = command.variables or {}
        explicit = str(variables.get("message") or "").strip()
        if explicit:
            return explicit

        if command.template_key == "TEST_NOTIFICATION":
            return "Mensagem de teste AgendaFácil enviada via Evolution."

        ordered = ", ".join(f"{key}={value}" for key, value in variables.items())
        return f"[{command.template_key}] {ordered}".strip()

    def _headers(self, provider_config: dict[str, Any]) -> dict[str, str]:
        api_key = self._effective_value(provider_config, "api_key", "EVOLUTION_API_KEY", "")
        header_name = self._effective_value(provider_config, "api_key_header", "EVOLUTION_API_KEY_HEADER", "apikey") or "apikey"

        headers = {
            "Content-Type": "application/json",
        }
        if api_key:
            headers[header_name] = api_key
        return headers

    def _to_e164_like(self, raw: str) -> str:
        digits = "".join(ch for ch in str(raw or "") if ch.isdigit())
        if not digits:
            return digits
        if digits.startswith("55"):
            return digits
        return f"55{digits}"

    def _proxies(self) -> dict[str, str] | None:
        http_proxy = str(MasterRuntimeConfigService.get_runtime_value("HTTP_PROXY", "") or "").strip()
        https_proxy = str(MasterRuntimeConfigService.get_runtime_value("HTTPS_PROXY", "") or "").strip()

        proxies: dict[str, str] = {}
        if http_proxy:
            proxies["http"] = http_proxy
        if https_proxy:
            proxies["https"] = https_proxy
        return proxies or None

    def _no_proxy_values(self) -> str:
        runtime_no_proxy = str(MasterRuntimeConfigService.get_runtime_value("NO_PROXY", "") or "").strip()
        env_no_proxy = str(os.getenv("NO_PROXY") or os.getenv("no_proxy") or "").strip()
        if runtime_no_proxy and env_no_proxy:
            return f"{runtime_no_proxy},{env_no_proxy}"
        return runtime_no_proxy or env_no_proxy

    def _host_in_no_proxy(self, url: str) -> bool:
        hostname = str((urlparse(url).hostname or "")).strip().lower()
        if not hostname:
            return False

        raw = self._no_proxy_values()
        if not raw:
            return False

        entries = [item.strip().lower() for item in raw.split(",") if item.strip()]
        for entry in entries:
            if entry == "*":
                return True
            if entry.startswith(".") and hostname.endswith(entry):
                return True
            if hostname == entry or hostname.endswith(f".{entry}"):
                return True
        return False

    @staticmethod
    def _extract_provider_ref(parsed: dict[str, Any]) -> str | None:
        provider_ref = (
            parsed.get("key")
            or parsed.get("id")
            or (parsed.get("data") or {}).get("id")
            or (parsed.get("message") or {}).get("id")
        )
        return str(provider_ref) if provider_ref else None

    def send(self, command: NotificationCommand) -> DispatchResult:
        if command.channel != Channel.WHATSAPP:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code="UNSUPPORTED_CHANNEL",
                error_message="Adapter Evolution suporta apenas WHATSAPP",
            )

        provider_config = self._tenant_provider_config(command.tenant_id)

        try:
            url = self._build_url(provider_config)
        except Exception as exc:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code="CONFIG_ERROR",
                error_message=str(exc),
            )

        timeout = int(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_HTTP_TIMEOUT_SECONDS", 10) or 10)
        payload: dict[str, Any] = {
            "number": self._to_e164_like(command.to),
            "text": self._render_message(command),
        }
        proxies = self._proxies()
        if self._host_in_no_proxy(url):
            proxies = None

        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._headers(provider_config),
                timeout=timeout,
                proxies=proxies,
            )
        except requests.RequestException as exc:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code="NETWORK_ERROR",
                error_message=str(exc),
            )

        parsed: dict[str, Any] = {}
        try:
            parsed = response.json() if response.text else {}
        except ValueError:
            parsed = {"raw": response.text}

        provider_ref = self._extract_provider_ref(parsed)

        if response.status_code >= 400:
            if response.status_code >= 500 and provider_ref:
                return DispatchResult(
                    status=DispatchStatus.SENT,
                    provider_ref=provider_ref,
                    raw_response=parsed,
                )
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code=f"HTTP_{response.status_code}",
                error_message=str(parsed.get("message") or parsed.get("error") or "Falha no provider Evolution"),
                raw_response=parsed,
            )

        return DispatchResult(
            status=DispatchStatus.SENT,
            provider_ref=provider_ref,
            raw_response=parsed,
        )
