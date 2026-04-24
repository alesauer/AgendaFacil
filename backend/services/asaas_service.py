"""
Serviço de integração com Asaas (sandbox/produção).

Responsabilidades:
- Criar link de checkout para assinatura recorrente
"""
from __future__ import annotations

import logging
import os
from datetime import date, timedelta

import requests

logger = logging.getLogger(__name__)

ASAAS_TIMEOUT = 20
VALID_PLAN_TIERS = {"ESSENCIAL", "PROFISSIONAL", "AVANCADO"}
VALID_CYCLES = {"MONTHLY", "YEARLY"}

PLAN_PRICES_CENTS: dict[tuple[str, str], int] = {
    ("ESSENCIAL", "MONTHLY"): 2990,
    ("ESSENCIAL", "YEARLY"): 26990,
    ("PROFISSIONAL", "MONTHLY"): 3990,
    ("PROFISSIONAL", "YEARLY"): 35990,
    ("AVANCADO", "MONTHLY"): 4990,
    ("AVANCADO", "YEARLY"): 44990,
}


def _get_api_key() -> str:
    key = str(os.getenv("ASAAS_API_KEY", "") or "").strip()
    if not key:
        raise ValueError("ASAAS_API_KEY não configurado")
    return key


def _get_base_url() -> str:
    return str(os.getenv("ASAAS_BASE_URL", "https://sandbox.asaas.com/api/v3") or "").strip().rstrip("/")


def _use_proxy() -> bool:
    raw = str(os.getenv("ASAAS_USE_PROXY", "false") or "false").strip().lower()
    return raw in {"1", "true", "yes", "sim"}


def _normalize_tier(value: str | None) -> str:
    tier = str(value or "PROFISSIONAL").strip().upper()
    return tier if tier in VALID_PLAN_TIERS else "PROFISSIONAL"


def _normalize_cycle(value: str | None) -> str:
    cycle = str(value or "MONTHLY").strip().upper()
    return cycle if cycle in VALID_CYCLES else "MONTHLY"


def _get_plan_value(tier: str, cycle: str) -> float:
    cents = PLAN_PRICES_CENTS.get((tier, cycle))
    if cents is None:
        raise ValueError("Plano/ciclo inválido para Asaas")
    return round(cents / 100.0, 2)


def _http(method: str, path: str, *, params: dict | None = None, payload: dict | None = None) -> dict:
    base = _get_base_url()
    key = _get_api_key()
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "access_token": key,
    }
    url = f"{base}{path}"
    request_kwargs = {
        "method": method,
        "url": url,
        "headers": headers,
        "params": params,
        "json": payload,
        "timeout": ASAAS_TIMEOUT,
    }
    if not _use_proxy():
        request_kwargs["proxies"] = {"http": None, "https": None}

    response = requests.request(
        **request_kwargs,
    )

    try:
        data = response.json() if response.text else {}
    except Exception:
        data = {"raw": response.text}

    if response.status_code >= 400:
        errors = data.get("errors") if isinstance(data, dict) else None
        message = "Erro na API Asaas"
        if isinstance(errors, list) and errors:
            first = errors[0] or {}
            message = str(first.get("description") or first.get("code") or message)
        elif isinstance(data, dict):
            message = str(data.get("message") or message)
        raise ValueError(f"Asaas: {message}")

    return data if isinstance(data, dict) else {}


def _find_or_create_customer(
    *,
    email: str,
    name: str,
    phone: str | None,
    external_reference: str,
    document: str | None,
) -> str:

    payload = {
        "name": name,
        "email": email,
        "externalReference": external_reference,
    }
    if phone:
        payload["phone"] = phone
    if document:
        payload["cpfCnpj"] = document

    created = _http("POST", "/customers", payload=payload)
    customer_id = str(created.get("id") or "").strip()
    if not customer_id:
        raise ValueError("Asaas não retornou customer id")
    return customer_id


def _extract_invoice_url(subscription_id: str) -> str:
    payments = _http("GET", "/payments", params={"subscription": subscription_id, "limit": 1})
    items = payments.get("data") or []
    first = items[0] if items else {}

    for key in ("invoiceUrl", "bankSlipUrl"):
        value = str((first or {}).get(key) or "").strip()
        if value:
            return value

    raise ValueError("Asaas não retornou URL de cobrança para a assinatura")


def create_subscription_checkout_link(
    *,
    ciclo: str,
    payer_email: str | None,
    barbearia_slug: str,
    plano_tier: str | None,
    payer_name: str | None = None,
    payer_phone: str | None = None,
    payer_document: str | None = None,
) -> dict:
    tier = _normalize_tier(plano_tier)
    cycle = _normalize_cycle(ciclo)

    email = str(payer_email or os.getenv("ASAAS_SANDBOX_CUSTOMER_EMAIL", "") or "").strip()
    if not email:
        raise ValueError("Informe email do pagador ou configure ASAAS_SANDBOX_CUSTOMER_EMAIL")

    name = str(payer_name or os.getenv("ASAAS_SANDBOX_CUSTOMER_NAME", "Cliente AgendaFacil") or "Cliente AgendaFacil").strip()
    phone = str(payer_phone or os.getenv("ASAAS_SANDBOX_CUSTOMER_PHONE", "") or "").strip() or None
    document = str(payer_document or os.getenv("ASAAS_SANDBOX_CUSTOMER_CPF_CNPJ", "") or "").strip() or None
    if not document:
        raise ValueError("Configure ASAAS_SANDBOX_CUSTOMER_CPF_CNPJ para criar assinatura no Asaas")

    external_reference = str(barbearia_slug or "").strip() or "barbearia"
    customer_id = _find_or_create_customer(
        email=email,
        name=name,
        phone=phone,
        external_reference=external_reference,
        document=document,
    )

    cycle_asaas = "YEARLY" if cycle == "YEARLY" else "MONTHLY"
    value = _get_plan_value(tier, cycle)
    next_due_date = (date.today() + timedelta(days=1)).isoformat()
    billing_type = str(os.getenv("ASAAS_BILLING_TYPE", "UNDEFINED") or "UNDEFINED").strip().upper()

    subscription_payload = {
        "customer": customer_id,
        "billingType": billing_type,
        "value": value,
        "nextDueDate": next_due_date,
        "cycle": cycle_asaas,
        "description": f"AgendaFacil - {tier.title()} {'Anual' if cycle == 'YEARLY' else 'Mensal'}",
        "externalReference": external_reference,
    }

    created = _http("POST", "/subscriptions", payload=subscription_payload)
    subscription_id = str(created.get("id") or "").strip()
    if not subscription_id:
        raise ValueError("Asaas não retornou id da assinatura")

    init_point = _extract_invoice_url(subscription_id)
    return {"init_point": init_point, "preapproval_id": subscription_id}
