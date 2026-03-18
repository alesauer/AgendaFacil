import re

from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.repositories.barbearia_repository import BarbeariaRepository
from backend.utils.http import error, success

barbearia_bp = Blueprint("barbearia", __name__, url_prefix="/barbearia")

HEX_COLOR_REGEX = re.compile(r"^#([A-Fa-f0-9]{6})$")
ALLOWED_ICONES = {"scissors", "store", "user", "sparkles", "heart", "zap"}
MAX_IMAGE_URL_LENGTH = 300000
MAX_LOGIN_BACKGROUND_URL_LENGTH = 3200000


def _normalize_image_url(value: str | None, field_name: str, max_length: int = MAX_IMAGE_URL_LENGTH):
    if not value:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    if len(raw) > max_length:
        raise ValueError(f"{field_name} excede o tamanho máximo permitido")
    if raw.startswith("data:image/") or raw.startswith("http://") or raw.startswith("https://"):
        return raw
    raise ValueError(f"{field_name} inválida. Use data URL de imagem ou URL http/https")


def _normalize_color(value: str | None, field_name: str):
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    if not HEX_COLOR_REGEX.match(raw):
        raise ValueError(f"{field_name} deve estar no formato #RRGGBB")
    return raw


@barbearia_bp.get("/identidade")
@auth_required
def get_identidade():
    if str(getattr(g, "user_role", "")).upper() != "ADMIN":
        return error("Acesso negado", 403)

    item = BarbeariaRepository.get_identity(g.barbearia_id)
    if not item:
        return error("Barbearia não encontrada", 404)
    return success(item)


@barbearia_bp.get("/identidade-publica")
def get_identidade_publica():
    item = BarbeariaRepository.get_identity(g.barbearia_id)
    if not item:
        return error("Barbearia não encontrada", 404)
    return success(
        {
            "nome": item.get("nome"),
            "logo_url": item.get("logo_url"),
            "login_logo_url": item.get("login_logo_url"),
            "login_background_url": item.get("login_background_url"),
            "icone_marca": item.get("icone_marca"),
            "cor_primaria": item.get("cor_primaria"),
            "cor_secundaria": item.get("cor_secundaria"),
        }
    )


@barbearia_bp.put("/identidade")
@auth_required
def update_identidade():
    if str(getattr(g, "user_role", "")).upper() != "ADMIN":
        return error("Acesso negado", 403)

    payload = request.get_json(silent=True) or {}

    nome = str(payload.get("nome") or "").strip()
    if not nome:
        return error("nome é obrigatório", 400)
    if len(nome) > 120:
        return error("nome deve ter no máximo 120 caracteres", 400)

    icone_marca_raw = payload.get("icone_marca")
    icone_marca = str(icone_marca_raw).strip().lower() if icone_marca_raw is not None else None
    if icone_marca and icone_marca not in ALLOWED_ICONES:
        return error("icone_marca inválido", 400)

    try:
        logo_url = _normalize_image_url(payload.get("logo_url"), "logo_url")
        login_logo_url = _normalize_image_url(payload.get("login_logo_url"), "login_logo_url")
        login_background_url = _normalize_image_url(
            payload.get("login_background_url"),
            "login_background_url",
            MAX_LOGIN_BACKGROUND_URL_LENGTH,
        )
        cor_primaria = _normalize_color(payload.get("cor_primaria"), "cor_primaria")
        cor_secundaria = _normalize_color(payload.get("cor_secundaria"), "cor_secundaria")
    except ValueError as exc:
        return error(str(exc), 400)

    item = BarbeariaRepository.update_identity(
        g.barbearia_id,
        nome,
        logo_url,
        login_logo_url,
        login_background_url,
        icone_marca,
        cor_primaria,
        cor_secundaria,
    )
    if not item:
        return error("Barbearia não encontrada", 404)
    return success(item)
