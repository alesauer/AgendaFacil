"""
Serviço de integração com Mercado Pago.

Responsabilidades:
- Criar link de checkout para assinatura (preapproval)
- Consultar status de uma assinatura (preapproval)
- Validar assinatura HMAC das notificações de webhook
"""
import hashlib
import hmac
import logging
from datetime import datetime, timezone

import requests

from backend.services.master_runtime_config_service import MasterRuntimeConfigService

logger = logging.getLogger(__name__)

MP_API_BASE = "https://api.mercadopago.com"
MP_API_TIMEOUT = 15


def _get_access_token() -> str:
    token = str(MasterRuntimeConfigService.get_runtime_value("MP_ACCESS_TOKEN", "") or "").strip()
    if not token:
        raise ValueError("MP_ACCESS_TOKEN não configurado")
    return token


def _get_webhook_secret() -> str:
    return str(MasterRuntimeConfigService.get_runtime_value("MP_WEBHOOK_SECRET", "") or "").strip()


def _get_plan_id(ciclo: str) -> str:
    if ciclo == "YEARLY":
        plan_id = str(MasterRuntimeConfigService.get_runtime_value("MP_PLAN_ID_YEARLY", "") or "").strip()
    else:
        plan_id = str(MasterRuntimeConfigService.get_runtime_value("MP_PLAN_ID_MONTHLY", "") or "").strip()
    return plan_id


def validate_webhook_signature(x_signature: str, x_request_id: str, data_id: str) -> bool:
    """
    Valida a assinatura HMAC-SHA256 do webhook do Mercado Pago.

    Header x-signature formato: ts=1234567890,v1=abc123hash
    Mensagem assinada: id:{data_id};request-id:{x_request_id};ts:{ts}
    """
    secret = _get_webhook_secret()
    if not secret:
        logger.warning("MP_WEBHOOK_SECRET não configurado — assinatura não validada")
        return True  # permissivo em dev; em prod retorne False se quiser rigor

    try:
        parts = {kv.split("=")[0]: kv.split("=")[1] for kv in x_signature.split(",") if "=" in kv}
        ts = parts.get("ts", "")
        v1 = parts.get("v1", "")
        if not ts or not v1:
            return False

        message = f"id:{data_id};request-id:{x_request_id};ts:{ts}"
        expected = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, v1)
    except Exception as exc:
        logger.exception("Erro ao validar assinatura MP: %s", exc)
        return False


def get_preapproval(preapproval_id: str) -> dict | None:
    """Consulta detalhes de uma assinatura (preapproval) no MP."""
    try:
        token = _get_access_token()
        resp = requests.get(
            f"{MP_API_BASE}/preapproval/{preapproval_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=MP_API_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.exception("Erro ao consultar preapproval %s: %s", preapproval_id, exc)
        return None


def create_preapproval_link(
    ciclo: str,
    payer_email: str | None,
    barbearia_slug: str,
    back_url: str,
) -> dict:
    """
    Cria uma assinatura (preapproval) no MP e retorna a URL de checkout (init_point).

    Retorna: {"init_point": "https://www.mercadopago.com.br/subscriptions/checkout?..."}
    """
    token = _get_access_token()
    plan_id = _get_plan_id(ciclo)

    payload: dict = {
        "external_reference": barbearia_slug,
        "back_url": back_url,
    }

    if plan_id:
        # Associa ao plano pré-criado
        payload["preapproval_plan_id"] = plan_id
    else:
        # Fallback: define recorrência inline
        amount = 39.00 if ciclo != "YEARLY" else 297.00
        frequency = 1 if ciclo != "YEARLY" else 12
        payload["reason"] = "Barbeiros App - Plano " + ("Anual" if ciclo == "YEARLY" else "Mensal")
        payload["auto_recurring"] = {
            "frequency": frequency,
            "frequency_type": "months",
            "transaction_amount": amount,
            "currency_id": "BRL",
        }

    if payer_email:
        payload["payer_email"] = payer_email

    resp = requests.post(
        f"{MP_API_BASE}/preapproval",
        json=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=MP_API_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    return {"init_point": data.get("init_point"), "preapproval_id": data.get("id")}


def extract_subscription_details(preapproval: dict) -> dict:
    """
    Extrai campos relevantes de um objeto preapproval do MP.
    """
    auto = preapproval.get("auto_recurring") or {}
    plan_id = preapproval.get("preapproval_plan_id")

    # Determina ciclo
    freq = int(auto.get("frequency") or 1)
    freq_type = str(auto.get("frequency_type") or "months").lower()
    if freq_type == "months" and freq >= 12:
        cycle = "YEARLY"
        amount_cents = 29700
    else:
        cycle = "MONTHLY"
        amount_cents = 3900

    # Override por amount
    raw_amount = auto.get("transaction_amount")
    if raw_amount:
        amount_cents = int(float(raw_amount) * 100)

    # Datas
    def _parse_dt(v):
        if not v:
            return None
        try:
            return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        except Exception:
            return None

    return {
        "subscription_id": preapproval.get("id"),
        "customer_id": preapproval.get("payer_id") or preapproval.get("payer_email"),
        "plan_id": plan_id,
        "cycle": cycle,
        "amount_cents": amount_cents,
        "status": preapproval.get("status"),
        "next_payment_date": _parse_dt(preapproval.get("next_payment_date")),
        "date_created": _parse_dt(preapproval.get("date_created")),
        "external_reference": preapproval.get("external_reference"),
    }


def mp_status_to_app_status(mp_status: str | None) -> str:
    """Converte status do MP para status interno."""
    key = str(mp_status or "").lower().strip()
    if key == "authorized":
        return "ACTIVE"
    if key == "pending":
        return "TRIAL"
    if key in {"paused"}:
        return "PAST_DUE"
    if key in {"cancelled", "canceled"}:
        return "CANCELLED"
    return "ACTIVE"
