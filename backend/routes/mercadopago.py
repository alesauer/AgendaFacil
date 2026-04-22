"""
Webhook do Mercado Pago.

Recebe notificações de assinaturas (preapproval) e atualiza o status
da barbearia correspondente.

Eventos suportados:
  - subscription_preapproval        → mudança de status da assinatura
  - subscription_authorized_payment → pagamento aprovado/rejeitado
"""
import logging

from flask import Blueprint, current_app, request

from backend.repositories.barbearia_repository import BarbeariaRepository
from backend.services import mercadopago_service as mp
from backend.services.master_runtime_config_service import MasterRuntimeConfigService
from backend.utils.http import error, success

logger = logging.getLogger(__name__)

mercadopago_bp = Blueprint("mercadopago", __name__, url_prefix="/mercadopago")

SUPPORTED_TYPES = {
    "subscription_preapproval",
    "subscription_authorized_payment",
}


def _resolve_barbearia_id(external_reference: str | None) -> str | None:
    slug = str(external_reference or "").strip().lower()

    if not slug:
        slug = str(MasterRuntimeConfigService.get_runtime_value("MP_WEBHOOK_BARBEARIA_SLUG", "") or "").strip().lower()

    if not slug:
        slug = str(current_app.config.get("DEFAULT_BARBEARIA_SLUG") or "").strip().lower()

    if not slug:
        return None

    from backend.repositories.barbearia_repository import BarbeariaRepository
    return BarbeariaRepository.get_barbearia_id_by_slug(slug)


@mercadopago_bp.post("/webhook")
def mercadopago_webhook():
    # Validação de assinatura HMAC
    x_signature = request.headers.get("x-signature", "")
    x_request_id = request.headers.get("x-request-id", "")
    body = request.get_json(silent=True) or {}

    notification_type = str(body.get("type") or request.args.get("type") or "").strip()
    data_id = str((body.get("data") or {}).get("id") or request.args.get("data.id") or "").strip()

    if x_signature and data_id:
        if not mp.validate_webhook_signature(x_signature, x_request_id, data_id):
            logger.warning("Assinatura inválida no webhook MP — x-request-id=%s", x_request_id)
            return error("Assinatura de webhook inválida", 400)

    if notification_type not in SUPPORTED_TYPES:
        return success({"ignored": True, "reason": "unsupported_type", "type": notification_type})

    if not data_id:
        return success({"ignored": True, "reason": "missing_data_id"})

    # Consulta detalhes da assinatura no MP
    preapproval = mp.get_preapproval(data_id)
    if not preapproval:
        logger.error("Não foi possível consultar preapproval %s no MP", data_id)
        return error("Não foi possível consultar a assinatura no Mercado Pago", 502)

    details = mp.extract_subscription_details(preapproval)
    external_ref = details.get("external_reference")
    mp_status = details.get("status")

    barbearia_id = _resolve_barbearia_id(external_ref)
    if not barbearia_id:
        logger.warning("Tenant não resolvido para external_reference=%s", external_ref)
        return success({"ignored": True, "reason": "tenant_not_resolved", "external_reference": external_ref})

    # Determina status da assinatura na nossa terminologia
    if notification_type == "subscription_authorized_payment":
        payment_status = str(preapproval.get("status") or "").lower()
        if payment_status in {"approved", "authorized"}:
            next_status = "ACTIVE"
        elif payment_status in {"cancelled", "canceled", "rejected"}:
            next_status = "PAST_DUE"
        else:
            next_status = mp.mp_status_to_app_status(mp_status)
    else:
        next_status = mp.mp_status_to_app_status(mp_status)

    updated = BarbeariaRepository.apply_subscription_webhook(
        barbearia_id,
        event_id=data_id,
        event_type=notification_type,
        assinatura_status=next_status,
        ciclo_cobranca=details.get("cycle"),
        valor_plano_centavos=details.get("amount_cents"),
        proxima_cobranca_em=details.get("next_payment_date"),
        assinatura_inicio_em=details.get("date_created"),
        payment_customer_id=str(details.get("customer_id") or ""),
        payment_subscription_id=str(details.get("subscription_id") or ""),
        payment_plan_id=str(details.get("plan_id") or ""),
        payment_provider="mercadopago",
    )

    if not updated:
        return error("Não foi possível processar assinatura do webhook", 500)

    return success({"processed": True, "event_id": data_id, "event_type": notification_type})
