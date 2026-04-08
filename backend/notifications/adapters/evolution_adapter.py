from __future__ import annotations

from typing import Any

import requests
from flask import current_app

from backend.notifications.models import Channel, DispatchResult, DispatchStatus, NotificationCommand
from backend.services.master_runtime_config_service import MasterRuntimeConfigService


class EvolutionWhatsAppAdapter:
    provider_name = "EVOLUTION"

    def supports(self, channel: Channel) -> bool:
        return channel == Channel.WHATSAPP

    def health_check(self) -> bool:
        base_url = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_BASE_URL", "") or "").strip()
        instance = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_INSTANCE", "") or "").strip()
        return bool(base_url and instance)

    def _build_url(self) -> str:
        base_url = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_BASE_URL", "") or "").strip().rstrip("/")
        instance = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_INSTANCE", "") or "").strip()
        send_path = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_SEND_TEXT_PATH", "") or "").strip()

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

    def _headers(self) -> dict[str, str]:
        api_key = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_KEY", "") or "").strip()
        header_name = str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_KEY_HEADER", "apikey") or "apikey").strip()

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

    def send(self, command: NotificationCommand) -> DispatchResult:
        if command.channel != Channel.WHATSAPP:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code="UNSUPPORTED_CHANNEL",
                error_message="Adapter Evolution suporta apenas WHATSAPP",
            )

        try:
            url = self._build_url()
        except Exception as exc:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code="CONFIG_ERROR",
                error_message=str(exc),
            )

        timeout = int(current_app.config.get("EVOLUTION_HTTP_TIMEOUT_SECONDS") or 10)
        payload: dict[str, Any] = {
            "number": self._to_e164_like(command.to),
            "text": self._render_message(command),
        }

        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._headers(),
                timeout=timeout,
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

        if response.status_code >= 400:
            return DispatchResult(
                status=DispatchStatus.FAILED,
                error_code=f"HTTP_{response.status_code}",
                error_message=str(parsed.get("message") or parsed.get("error") or "Falha no provider Evolution"),
                raw_response=parsed,
            )

        provider_ref = (
            parsed.get("key")
            or parsed.get("id")
            or (parsed.get("data") or {}).get("id")
            or (parsed.get("message") or {}).get("id")
        )

        return DispatchResult(
            status=DispatchStatus.SENT,
            provider_ref=str(provider_ref) if provider_ref else None,
            raw_response=parsed,
        )
