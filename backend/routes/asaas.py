"""
Webhook do Asaas.

Recebe notificações de assinatura/pagamento e atualiza o status
da assinatura da barbearia correspondente.
"""

from __future__ import annotations

import os

from flask import Blueprint, current_app, request

from backend.repositories.barbearia_repository import BarbeariaRepository
from backend.services.master_runtime_config_service import MasterRuntimeConfigService
from backend.utils.http import error, success

asaas_bp = Blueprint("asaas", __name__, url_prefix="/asaas")


def _runtime_value(env_key: str, fallback: str = "") -> str:
    return str(MasterRuntimeConfigService.get_runtime_value(env_key, fallback) or fallback).strip()


SUPPORTED_EVENTS = {
    "PAYMENT_CREATED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_RECEIVED",
    "PAYMENT_OVERDUE",
    "PAYMENT_DELETED",
    "PAYMENT_RESTORED",
    "SUBSCRIPTION_CREATED",
    "SUBSCRIPTION_UPDATED",
    "SUBSCRIPTION_DELETED",
    "SUBSCRIPTION_INACTIVATED",
}


def _normalize_cycle(value: str | None) -> str:
    cycle = str(value or "").strip().upper()
    if cycle in {"YEARLY", "ANNUALLY"}:
        return "YEARLY"
    return "MONTHLY"


def _status_from_event(event: str) -> str:
    normalized = str(event or "").strip().upper()
    if normalized in {"PAYMENT_OVERDUE"}:
        return "PAST_DUE"
    if normalized in {"SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"}:
        return "CANCELLED"
    if normalized in {
        "PAYMENT_CREATED",
        "PAYMENT_CONFIRMED",
        "PAYMENT_RECEIVED",
        "PAYMENT_RESTORED",
        "SUBSCRIPTION_CREATED",
        "SUBSCRIPTION_UPDATED",
    }:
        return "ACTIVE"
    return "ACTIVE"


def _to_cents(value) -> int | None:
    if value is None:
        return None
    try:
        return int(round(float(value) * 100))
    except Exception:
        return None


def _resolve_barbearia_id(external_reference: str | None) -> str | None:
    slug = str(external_reference or "").strip().lower()

    if not slug:
        slug = _runtime_value("ASAAS_WEBHOOK_BARBEARIA_SLUG", "").lower()

    if not slug:
        slug = str(current_app.config.get("DEFAULT_BARBEARIA_SLUG") or "").strip().lower()

    if not slug:
        return None

    return BarbeariaRepository.get_barbearia_id_by_slug(slug)


def _extract_external_reference(payload: dict) -> str | None:
    payment = payload.get("payment") if isinstance(payload.get("payment"), dict) else {}
    subscription = payload.get("subscription") if isinstance(payload.get("subscription"), dict) else {}

    return (
        payment.get("externalReference")
        or subscription.get("externalReference")
        or payload.get("externalReference")
    )


def _extract_subscription_id(payload: dict) -> str | None:
    payment = payload.get("payment") if isinstance(payload.get("payment"), dict) else {}
    subscription = payload.get("subscription") if isinstance(payload.get("subscription"), dict) else {}

    return (
        payment.get("subscription")
        or subscription.get("id")
        or payload.get("subscription")
    )


def _extract_customer_id(payload: dict) -> str | None:
    payment = payload.get("payment") if isinstance(payload.get("payment"), dict) else {}
    subscription = payload.get("subscription") if isinstance(payload.get("subscription"), dict) else {}

    return (
        payment.get("customer")
        or subscription.get("customer")
        or payload.get("customer")
    )


def _extract_cycle(payload: dict) -> str:
    payment = payload.get("payment") if isinstance(payload.get("payment"), dict) else {}
    subscription = payload.get("subscription") if isinstance(payload.get("subscription"), dict) else {}
    cycle_value = (
        subscription.get("cycle")
        or payment.get("cycle")
        or payload.get("cycle")
    )
    return _normalize_cycle(str(cycle_value or ""))


def _extract_value_cents(payload: dict) -> int | None:
    payment = payload.get("payment") if isinstance(payload.get("payment"), dict) else {}
    subscription = payload.get("subscription") if isinstance(payload.get("subscription"), dict) else {}

    return (
        _to_cents(payment.get("value"))
        or _to_cents(subscription.get("value"))
        or _to_cents(payload.get("value"))
    )


def _extract_next_due_date(payload: dict):
    payment = payload.get("payment") if isinstance(payload.get("payment"), dict) else {}
    subscription = payload.get("subscription") if isinstance(payload.get("subscription"), dict) else {}
    return (
        payment.get("dueDate")
        or subscription.get("nextDueDate")
        or payload.get("nextDueDate")
    )


def _extract_subscription_start(payload: dict):
    subscription = payload.get("subscription") if isinstance(payload.get("subscription"), dict) else {}
    return subscription.get("dateCreated") or payload.get("dateCreated")


def _event_id(payload: dict, event: str) -> str:
    payment = payload.get("payment") if isinstance(payload.get("payment"), dict) else {}
    subscription = payload.get("subscription") if isinstance(payload.get("subscription"), dict) else {}

    return str(
        payload.get("id")
        or payment.get("id")
        or subscription.get("id")
        or f"{event}:{payload.get('dateCreated') or ''}"
    )


@asaas_bp.post("/webhook")
def asaas_webhook():
    configured_token = _runtime_value("ASAAS_WEBHOOK_TOKEN", str(os.getenv("ASAAS_WEBHOOK_TOKEN") or ""))
    received_token = str(request.headers.get("asaas-access-token") or "").strip()

    import logging
    logger = logging.getLogger(__name__)
    logger.warning("WEBHOOK_TOKEN_CHECK configured=%r received=%r match=%s", configured_token, received_token, configured_token == received_token)

    if configured_token and configured_token != received_token:
        return error("Token de webhook inválido", 401)

    payload = request.get_json(silent=True) or {}
    event = str(payload.get("event") or "").strip().upper()

    if event not in SUPPORTED_EVENTS:
        return success({"ignored": True, "reason": "unsupported_event", "event": event})

    external_reference = _extract_external_reference(payload)
    barbearia_id = _resolve_barbearia_id(external_reference)
    if not barbearia_id:
        return success(
            {
                "ignored": True,
                "reason": "tenant_not_resolved",
                "external_reference": external_reference,
                "event": event,
            }
        )

    updated = BarbeariaRepository.apply_subscription_webhook(
        barbearia_id,
        event_id=_event_id(payload, event),
        event_type=event,
        assinatura_status=_status_from_event(event),
        ciclo_cobranca=_extract_cycle(payload),
        valor_plano_centavos=_extract_value_cents(payload),
        proxima_cobranca_em=_extract_next_due_date(payload),
        assinatura_inicio_em=_extract_subscription_start(payload),
        payment_customer_id=str(_extract_customer_id(payload) or ""),
        payment_subscription_id=str(_extract_subscription_id(payload) or ""),
        payment_plan_id=None,
        payment_provider="asaas",
    )

    if not updated:
        return error("Não foi possível processar assinatura do webhook Asaas", 500)

    return success({"processed": True, "event": event})
