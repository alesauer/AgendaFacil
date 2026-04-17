from datetime import datetime, timezone

import stripe
from flask import Blueprint, current_app, request

from backend.repositories.barbearia_repository import BarbeariaRepository
from backend.services.master_runtime_config_service import MasterRuntimeConfigService
from backend.utils.http import error, success

stripe_bp = Blueprint("stripe", __name__, url_prefix="/stripe")

SUPPORTED_WEBHOOK_EVENTS = {
    "checkout.session.completed",
    "invoice.paid",
    "invoice.payment_failed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
}


def _resolve_barbearia_id(event_data: dict) -> str | None:
    metadata = event_data.get("metadata") if isinstance(event_data, dict) else None
    metadata_slug = str((metadata or {}).get("barbearia_slug") or "").strip().lower()

    slug = metadata_slug or str(MasterRuntimeConfigService.get_runtime_value("STRIPE_WEBHOOK_BARBEARIA_SLUG", "") or "").strip().lower()
    if not slug:
        slug = str(current_app.config.get("DEFAULT_BARBEARIA_SLUG") or "").strip().lower()

    if not slug:
        return None

    return BarbeariaRepository.get_barbearia_id_by_slug(slug)


def _cycle_from_price(price_id: str | None, interval: str | None):
    monthly_price_id = str(MasterRuntimeConfigService.get_runtime_value("STRIPE_PRICE_ID_MONTHLY", "") or "").strip()
    yearly_price_id = str(MasterRuntimeConfigService.get_runtime_value("STRIPE_PRICE_ID_YEARLY", "") or "").strip()

    if price_id and monthly_price_id and price_id == monthly_price_id:
        return "MONTHLY", 3900
    if price_id and yearly_price_id and price_id == yearly_price_id:
        return "YEARLY", 29700

    interval_key = str(interval or "").lower().strip()
    if interval_key == "year":
        return "YEARLY", 29700
    return "MONTHLY", 3900


def _status_from_subscription_status(stripe_status: str | None):
    key = str(stripe_status or "").lower().strip()
    if key in {"active"}:
        return "ACTIVE"
    if key in {"trialing"}:
        return "TRIAL"
    if key in {"past_due", "unpaid", "incomplete", "incomplete_expired"}:
        return "PAST_DUE"
    if key in {"canceled"}:
        return "CANCELLED"
    return "ACTIVE"


def _retrieve_subscription(subscription_id: str | None):
    if not subscription_id:
        return None
    try:
        return stripe.Subscription.retrieve(subscription_id, expand=["items.data.price"])
    except Exception:
        return None


def _extract_subscription_payload(subscription):
    def _field(source, key, default=None):
        if source is None:
            return default
        if isinstance(source, dict):
            return source.get(key, default)
        try:
            value = source.get(key)  # StripeObject compat
            if value is not None:
                return value
        except Exception:
            pass
        return getattr(source, key, default)

    if not subscription:
        return {
            "subscription_id": None,
            "customer_id": None,
            "price_id": None,
            "interval": None,
            "current_period_end": None,
            "current_period_start": None,
            "status": None,
        }

    items_container = _field(subscription, "items") or {}
    items_data = _field(items_container, "data", []) or []
    first_item = items_data[0] if items_data else None
    price = _field(first_item, "price") if first_item else None
    recurring = _field(price, "recurring", {}) or {}

    period_end = _field(subscription, "current_period_end")
    period_start = _field(subscription, "current_period_start")

    return {
        "subscription_id": _field(subscription, "id"),
        "customer_id": _field(subscription, "customer"),
        "price_id": _field(price, "id"),
        "interval": _field(recurring, "interval"),
        "current_period_end": datetime.fromtimestamp(period_end, tz=timezone.utc) if period_end else None,
        "current_period_start": datetime.fromtimestamp(period_start, tz=timezone.utc) if period_start else None,
        "status": _field(subscription, "status"),
    }


@stripe_bp.post("/webhook")
def stripe_webhook():
    secret_key = str(MasterRuntimeConfigService.get_runtime_value("STRIPE_SECRET_KEY", "") or "").strip()
    webhook_secret = str(MasterRuntimeConfigService.get_runtime_value("STRIPE_WEBHOOK_SECRET", "") or "").strip()

    if not secret_key or not webhook_secret:
        return error("Stripe não configurado no servidor", 503)

    stripe.api_key = secret_key

    payload = request.get_data(cache=False, as_text=False)
    signature = request.headers.get("Stripe-Signature", "")

    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=signature, secret=webhook_secret)
    except stripe.error.SignatureVerificationError:
        return error("Assinatura de webhook inválida", 400)
    except Exception:
        return error("Payload inválido no webhook Stripe", 400)

    event_id = str(event.get("id") or "")
    event_type = str(event.get("type") or "")
    event_data = (event.get("data") or {}).get("object") or {}

    if event_type not in SUPPORTED_WEBHOOK_EVENTS:
        return success({"ignored": True, "reason": "unsupported_event", "event_id": event_id, "event_type": event_type})

    barbearia_id = _resolve_barbearia_id(event_data)
    if not barbearia_id:
        return success({"ignored": True, "reason": "tenant_not_resolved", "event_id": event_id})

    subscription = None
    invoice_subscription_id = None
    checkout_subscription_id = None

    if event_type.startswith("customer.subscription."):
        subscription = event_data

    if event_type.startswith("invoice."):
        invoice_subscription_id = event_data.get("subscription")
        subscription = _retrieve_subscription(invoice_subscription_id)

    if event_type == "checkout.session.completed":
        checkout_subscription_id = event_data.get("subscription")
        if not checkout_subscription_id:
            return success({"ignored": True, "reason": "checkout_without_subscription", "event_id": event_id, "event_type": event_type})
        subscription = _retrieve_subscription(checkout_subscription_id)

    details = _extract_subscription_payload(subscription)
    cycle, value_cents = _cycle_from_price(details.get("price_id"), details.get("interval"))

    next_status = "ACTIVE"
    if event_type == "invoice.payment_failed":
        next_status = "PAST_DUE"
    elif event_type == "customer.subscription.deleted":
        next_status = "CANCELLED"
    elif event_type.startswith("customer.subscription."):
        next_status = _status_from_subscription_status(details.get("status"))
    elif event_type in {"invoice.paid", "checkout.session.completed"}:
        next_status = "ACTIVE"

    updated = BarbeariaRepository.apply_subscription_webhook(
        barbearia_id,
        event_id=event_id,
        event_type=event_type,
        assinatura_status=next_status,
        ciclo_cobranca=cycle,
        valor_plano_centavos=value_cents,
        proxima_cobranca_em=details.get("current_period_end"),
        assinatura_inicio_em=details.get("current_period_start"),
        stripe_customer_id=details.get("customer_id") or event_data.get("customer"),
        stripe_subscription_id=details.get("subscription_id") or invoice_subscription_id or checkout_subscription_id,
        stripe_price_id=details.get("price_id"),
    )

    if not updated:
        return error("Não foi possível processar assinatura do webhook", 500)

    return success({"processed": True, "event_id": event_id, "event_type": event_type})
