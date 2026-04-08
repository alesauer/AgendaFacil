from __future__ import annotations

from flask import Blueprint, g, request

from backend.middleware.auth import master_auth_required
from backend.services.master_runtime_config_service import MasterRuntimeConfigService
from backend.utils.http import error, success

master_settings_bp = Blueprint("master_settings", __name__, url_prefix="/master/settings")


@master_settings_bp.get("/catalog")
@master_auth_required
def get_catalog():
    return success(MasterRuntimeConfigService.get_catalog())


@master_settings_bp.get("")
@master_auth_required
def list_settings():
    try:
        data = MasterRuntimeConfigService.list_settings()
        return success(data)
    except Exception as exc:
        return error(f"Falha ao listar configurações: {exc}", 400)


@master_settings_bp.put("/<path:setting_key>")
@master_auth_required
def save_pending(setting_key: str):
    payload = request.get_json(silent=True) or {}
    has_value = "value" in payload
    if not has_value:
        return error("Campo value é obrigatório", 400)

    try:
        data = MasterRuntimeConfigService.save_pending(
            setting_key=setting_key,
            raw_value=payload.get("value"),
            changed_by=str(getattr(g, "user_id", "master")),
        )
        return success(data)
    except ValueError as exc:
        return error(str(exc), 400)
    except Exception as exc:
        return error(f"Falha ao salvar configuração: {exc}", 400)


@master_settings_bp.post("/test")
@master_auth_required
def test_settings_category():
    payload = request.get_json(silent=True) or {}
    category = str(payload.get("category") or "").strip().lower()
    use_pending = bool(payload.get("use_pending", True))

    if not category:
        return error("category é obrigatório", 400)

    try:
        result = MasterRuntimeConfigService.test_category(category=category, use_pending=use_pending)
        if not bool(result.get("ok", False)):
            return error(str(result.get("message") or "Teste falhou"), 422, details=result)
        return success(result)
    except ValueError as exc:
        return error(str(exc), 400)
    except Exception as exc:
        return error(f"Falha ao testar configuração: {exc}", 400)


@master_settings_bp.post("/publish")
@master_auth_required
def publish_pending():
    payload = request.get_json(silent=True) or {}
    notes = str(payload.get("notes") or "").strip() or None

    try:
        result = MasterRuntimeConfigService.publish_pending(
            changed_by=str(getattr(g, "user_id", "master")),
            notes=notes,
        )
        status = 200 if int(result.get("published") or 0) > 0 else 202
        return success(result, status)
    except Exception as exc:
        return error(f"Falha ao publicar configurações: {exc}", 400)


@master_settings_bp.get("/releases")
@master_auth_required
def list_releases():
    try:
        limit = int(request.args.get("limit", "20") or "20")
    except Exception:
        limit = 20

    try:
        result = MasterRuntimeConfigService.list_releases(limit=limit)
        return success(result)
    except Exception as exc:
        return error(f"Falha ao listar releases: {exc}", 400)


@master_settings_bp.post("/rollback/<int:version>")
@master_auth_required
def rollback(version: int):
    payload = request.get_json(silent=True) or {}
    notes = str(payload.get("notes") or "").strip() or None

    try:
        result = MasterRuntimeConfigService.rollback_to_version(
            version=version,
            changed_by=str(getattr(g, "user_id", "master")),
            notes=notes,
        )
        return success(result)
    except ValueError as exc:
        return error(str(exc), 400)
    except Exception as exc:
        return error(f"Falha ao aplicar rollback: {exc}", 400)
