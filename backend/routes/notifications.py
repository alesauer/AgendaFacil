from __future__ import annotations

from uuid import uuid4

from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.notifications.dispatcher import NotificationDispatcher
from backend.notifications.models import Channel, NotificationCommand
from backend.repositories.notifications_repository import NotificationsRepository
from backend.utils.http import error, success

notifications_bp = Blueprint("notifications", __name__)


def _admin_guard():
    if str(getattr(g, "user_role", "")).upper() != "ADMIN":
        return error("Somente administradores podem testar notificações", 403)
    return None


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

    command = NotificationCommand(
        tenant_id=str(getattr(g, "barbearia_id", "")),
        channel=Channel.WHATSAPP,
        to=phone,
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
