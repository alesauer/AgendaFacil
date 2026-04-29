from datetime import datetime, timezone

from flask import Blueprint, g, request
from werkzeug.security import generate_password_hash

from backend.middleware.auth import create_access_token, master_auth_required
from backend.repositories.master_repository import MasterRepository
from backend.utils.http import error, success

master_bp = Blueprint("master", __name__, url_prefix="/master")


@master_bp.get("/tenants")
@master_auth_required
def list_tenants():
    search = request.args.get("search")
    status = request.args.get("status")
    try:
        data = MasterRepository.list_tenants_metrics(search=search, status=status)
    except Exception as exc:
        return error(f"Falha ao carregar barbearias: {exc}", 503)
    return success(data)


@master_bp.get("/overview")
@master_auth_required
def overview():
    search = request.args.get("search")
    status = request.args.get("status")
    try:
        data = MasterRepository.get_overview(search=search, status=status)
    except Exception as exc:
        return error(f"Falha ao carregar visão geral MASTER: {exc}", 503)
    return success(data)


@master_bp.post("/lab/provision")
@master_auth_required
def provision_tenant():
    payload = request.get_json(silent=True) or {}

    tenant_nome = str(payload.get("tenant_nome") or "").strip()
    tenant_slug = str(payload.get("tenant_slug") or "").strip().lower()
    tenant_telefone = str(payload.get("tenant_telefone") or "").strip() or None
    tenant_cidade = str(payload.get("tenant_cidade") or "").strip() or None

    admin_nome = str(payload.get("admin_nome") or "").strip()
    admin_telefone = str(payload.get("admin_telefone") or "").strip()
    admin_email = str(payload.get("admin_email") or "").strip().lower() or None
    admin_senha = str(payload.get("admin_senha") or "")

    if not tenant_nome or not tenant_slug:
        return error("tenant_nome e tenant_slug são obrigatórios", 400)

    if not admin_nome or not admin_telefone or not admin_senha:
        return error("admin_nome, admin_telefone e admin_senha são obrigatórios", 400)

    if len(admin_senha) < 6:
        return error("admin_senha deve ter ao menos 6 caracteres", 400)

    result = MasterRepository.provision_tenant_with_admin(
        tenant_nome=tenant_nome,
        tenant_slug=tenant_slug,
        tenant_telefone=tenant_telefone,
        tenant_cidade=tenant_cidade,
        admin_nome=admin_nome,
        admin_telefone=admin_telefone,
        admin_email=admin_email,
        admin_senha_hash=generate_password_hash(admin_senha),
    )

    if result.get("error"):
        message = str(result.get("error"))
        if "slug já cadastrado" in message.lower() or "já cadastrado" in message.lower():
            return error(message, 409)
        return error(message, 400)

    return success(result, 201)


@master_bp.get("/lab/checkin/search")
@master_auth_required
def search_checkin_candidates():
    tenant_slug = str(request.args.get("tenant_slug") or "").strip().lower()
    date = str(request.args.get("date") or "").strip()
    phone = str(request.args.get("phone") or "").strip()

    if not tenant_slug or not date or not phone:
        return error("tenant_slug, date e phone são obrigatórios", 400)

    result = MasterRepository.search_checkin_candidates(
        tenant_slug=tenant_slug,
        date=date,
        phone=phone,
    )
    if result.get("error"):
        message = str(result.get("error"))
        if "não encontrada" in message.lower():
            return error(message, 404)
        return error(message, 400)

    return success({"rows": result.get("rows") or []})


@master_bp.post("/lab/checkin/<agendamento_id>")
@master_auth_required
def perform_checkin(agendamento_id: str):
    payload = request.get_json(silent=True) or {}
    tenant_slug = str(payload.get("tenant_slug") or "").strip().lower()

    if not tenant_slug:
        return error("tenant_slug é obrigatório", 400)

    result = MasterRepository.perform_checkin(
        tenant_slug=tenant_slug,
        agendamento_id=agendamento_id,
    )
    if result.get("error"):
        message = str(result.get("error"))
        if "não encontrado" in message.lower() or "não encontrada" in message.lower():
            return error(message, 404)
        if "não permite" in message.lower():
            return error(message, 409)
        return error(message, 400)

    return success(
        {
            "already_checked_in": bool(result.get("already_checked_in", False)),
            "agendamento": result.get("agendamento"),
        }
    )


@master_bp.put("/tenants/<tenant_id>")
@master_auth_required
def update_tenant(tenant_id: str):
    payload = request.get_json(silent=True) or {}

    nome = str(payload.get("nome") or "").strip()
    slug = str(payload.get("slug") or "").strip().lower()
    telefone = str(payload.get("telefone") or "").strip() or None
    cidade = str(payload.get("cidade") or "").strip() or None

    if not nome:
        return error("nome é obrigatório", 400)
    if not slug:
        return error("slug é obrigatório", 400)

    result = MasterRepository.update_tenant(
        tenant_id=tenant_id,
        nome=nome,
        slug=slug,
        telefone=telefone,
        cidade=cidade,
    )

    if result.get("error"):
        message = str(result.get("error"))
        lower_message = message.lower()
        if "não encontrada" in lower_message:
            return error(message, 404)
        if "já cadastrado" in lower_message:
            return error(message, 409)
        return error(message, 400)

    return success(result.get("tenant"))


@master_bp.patch("/tenants/<tenant_id>/block")
@master_auth_required
def block_unblock_tenant(tenant_id: str):
    payload = request.get_json(silent=True) or {}
    blocked = payload.get("blocked")

    if not isinstance(blocked, bool):
        return error("blocked deve ser booleano", 400)

    result = MasterRepository.set_tenant_blocked(
        tenant_id=tenant_id,
        blocked=blocked,
    )

    if result.get("error"):
        message = str(result.get("error"))
        lower_message = message.lower()
        if "não encontrada" in lower_message:
            return error(message, 404)
        return error(message, 400)

    return success(result.get("tenant"))


@master_bp.post("/tenants/<tenant_id>/impersonate")
@master_auth_required
def impersonate_tenant_admin(tenant_id: str):
    payload = request.get_json(silent=True) or {}
    reason = str(payload.get("reason") or "Suporte MASTER").strip() or "Suporte MASTER"

    result = MasterRepository.get_tenant_admin_for_impersonation(tenant_id=tenant_id)
    if result.get("error"):
        message = str(result.get("error"))
        lower_message = message.lower()
        if "não encontrada" in lower_message:
            return error(message, 404)
        return error(message, 400)

    admin = result.get("admin") or {}
    tenant = result.get("tenant") or {}

    token = create_access_token(
        str(admin.get("id")),
        str(admin.get("barbearia_id")),
        "ADMIN",
        extra_claims={
            "impersonated_by": str(getattr(g, "user_id", "master")),
            "impersonation": True,
            "impersonation_reason": reason,
            "impersonated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return success(
        {
            "token": token,
            "tenant": {
                "id": tenant.get("id"),
                "nome": tenant.get("nome"),
                "slug": tenant.get("slug"),
            },
            "user": {
                "id": admin.get("id"),
                "barbearia_id": admin.get("barbearia_id"),
                "nome": admin.get("nome"),
                "telefone": admin.get("telefone") or "",
                "email": admin.get("email"),
                "role": "ADMIN",
                "ativo": bool(admin.get("ativo", True)),
            },
        }
    )


@master_bp.delete("/tenants/<tenant_id>")
@master_auth_required
def delete_tenant(tenant_id: str):
    result = MasterRepository.delete_tenant(tenant_id=tenant_id)
    if result.get("error"):
        message = str(result.get("error"))
        lower_message = message.lower()
        if "não encontrada" in lower_message:
            return error(message, 404)
        if "dados vinculados" in lower_message:
            return error(message, 409)
        return error(message, 400)

    return success(result.get("tenant"))
