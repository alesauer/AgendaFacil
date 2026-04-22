import re

from flask import Blueprint, current_app, g, request

from backend.middleware.auth import auth_required
from backend.repositories.barbearia_repository import BarbeariaRepository
from backend.services.master_runtime_config_service import MasterRuntimeConfigService
from backend.utils.http import error, success

barbearia_bp = Blueprint("barbearia", __name__, url_prefix="/barbearia")

HEX_COLOR_REGEX = re.compile(r"^#([A-Fa-f0-9]{6})$")
ALLOWED_ICONES = {"scissors", "store", "user", "sparkles", "heart", "zap"}
MAX_IMAGE_URL_LENGTH = 300000
MAX_LOGIN_BACKGROUND_URL_LENGTH = 3200000
ALLOWED_BILLING_CYCLES = {"MONTHLY", "YEARLY"}
ALLOWED_PLAN_TIERS = {"ESSENCIAL", "PROFISSIONAL", "AVANCADO"}


def _parse_bool(value, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "t", "yes", "y", "sim", "s", "on"}:
            return True
        if normalized in {"0", "false", "f", "no", "n", "nao", "não", "off", ""}:
            return False
    return default


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
            "churn_risk_days_threshold": int(item.get("churn_risk_days_threshold") or 45),
            "allow_employee_confirm_appointment": bool(item.get("allow_employee_confirm_appointment", False)),
            "allow_employee_create_appointment": bool(item.get("allow_employee_create_appointment", True)),
            "allow_employee_view_finance": bool(item.get("allow_employee_view_finance", False)),
            "allow_employee_view_reports": bool(item.get("allow_employee_view_reports", False)),
            "allow_employee_view_users": bool(item.get("allow_employee_view_users", False)),
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
    current_item = BarbeariaRepository.get_identity(g.barbearia_id)
    if not current_item:
        return error("Barbearia não encontrada", 404)

    nome = str(payload.get("nome") or "").strip()
    if not nome:
        return error("nome é obrigatório", 400)
    if len(nome) > 120:
        return error("nome deve ter no máximo 120 caracteres", 400)

    if "telefone" in payload:
        telefone = str(payload.get("telefone") or "").strip() or None
    else:
        telefone = current_item.get("telefone")

    if "cidade" in payload:
        cidade = str(payload.get("cidade") or "").strip() or None
    else:
        cidade = current_item.get("cidade")

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
        raw_churn_threshold = payload.get("churn_risk_days_threshold", current_item.get("churn_risk_days_threshold", 45))
        try:
            churn_risk_days_threshold = int(raw_churn_threshold)
        except (TypeError, ValueError):
            raise ValueError("churn_risk_days_threshold deve ser um número inteiro")
        if churn_risk_days_threshold < 1 or churn_risk_days_threshold > 365:
            raise ValueError("churn_risk_days_threshold deve estar entre 1 e 365")
        if "allow_employee_confirm_appointment" in payload:
            allow_employee_confirm_appointment = _parse_bool(
                payload.get("allow_employee_confirm_appointment"),
                False,
            )
        else:
            allow_employee_confirm_appointment = bool(
                current_item.get("allow_employee_confirm_appointment", False)
            )
        if "allow_employee_create_appointment" in payload:
            allow_employee_create_appointment = _parse_bool(
                payload.get("allow_employee_create_appointment"),
                True,
            )
        else:
            allow_employee_create_appointment = bool(
                current_item.get("allow_employee_create_appointment", True)
            )
        if "allow_employee_view_finance" in payload:
            allow_employee_view_finance = _parse_bool(
                payload.get("allow_employee_view_finance"),
                False,
            )
        else:
            allow_employee_view_finance = bool(
                current_item.get("allow_employee_view_finance", False)
            )
        if "allow_employee_view_reports" in payload:
            allow_employee_view_reports = _parse_bool(
                payload.get("allow_employee_view_reports"),
                False,
            )
        else:
            allow_employee_view_reports = bool(
                current_item.get("allow_employee_view_reports", False)
            )
        if "allow_employee_view_users" in payload:
            allow_employee_view_users = _parse_bool(
                payload.get("allow_employee_view_users"),
                False,
            )
        else:
            allow_employee_view_users = bool(
                current_item.get("allow_employee_view_users", False)
            )
        cor_primaria = _normalize_color(payload.get("cor_primaria"), "cor_primaria")
        cor_secundaria = _normalize_color(payload.get("cor_secundaria"), "cor_secundaria")
    except ValueError as exc:
        return error(str(exc), 400)

    item = BarbeariaRepository.update_identity(
        g.barbearia_id,
        nome,
        telefone,
        cidade,
        logo_url,
        login_logo_url,
        login_background_url,
        churn_risk_days_threshold,
        allow_employee_confirm_appointment,
        allow_employee_create_appointment,
        allow_employee_view_finance,
        allow_employee_view_reports,
        allow_employee_view_users,
        icone_marca,
        cor_primaria,
        cor_secundaria,
    )
    if not item:
        return error("Barbearia não encontrada", 404)
    return success(item)


@barbearia_bp.get("/assinatura")
@auth_required
def get_assinatura():
    if str(getattr(g, "user_role", "")).upper() != "ADMIN":
        return error("Acesso negado", 403)

    item = BarbeariaRepository.get_subscription(g.barbearia_id)
    if not item:
        return error("Barbearia não encontrada", 404)

    ciclo = str(item.get("ciclo_cobranca") or "MONTHLY").upper()
    valor_centavos = int(item.get("valor_plano_centavos") or (3990 if ciclo == "MONTHLY" else 35990))

    return success(
        {
            "plano": item.get("plano"),
            "assinatura_status": item.get("assinatura_status"),
            "assinatura_status_efetivo": item.get("assinatura_status_efetivo"),
            "ciclo_cobranca": ciclo,
            "valor_plano_centavos": valor_centavos,
            "trial_usado": bool(item.get("trial_usado", False)),
            "trial_inicio_em": item.get("trial_inicio_em"),
            "trial_fim_em": item.get("trial_fim_em"),
            "dias_restantes_trial": int(item.get("dias_restantes_trial") or 0),
            "assinatura_inicio_em": item.get("assinatura_inicio_em"),
            "proxima_cobranca_em": item.get("proxima_cobranca_em"),
            "atualizado_assinatura_em": item.get("atualizado_assinatura_em"),
            "planos_disponiveis": [
                {
                    "codigo": "ESSENCIAL_MONTHLY",
                    "plano_tier": "ESSENCIAL",
                    "ciclo_cobranca": "MONTHLY",
                    "titulo": "Essencial",
                    "valor_centavos": 2990,
                    "descricao": "Para quem está começando ou tem base menor de clientes.",
                    "checkout_url": "/barbearia/assinatura/checkout",
                },
                {
                    "codigo": "ESSENCIAL_YEARLY",
                    "plano_tier": "ESSENCIAL",
                    "ciclo_cobranca": "YEARLY",
                    "titulo": "Essencial",
                    "valor_centavos": 26990,
                    "descricao": "Para quem está começando ou tem base menor de clientes.",
                    "checkout_url": "/barbearia/assinatura/checkout",
                },
                {
                    "codigo": "PROFISSIONAL_MONTHLY",
                    "plano_tier": "PROFISSIONAL",
                    "ciclo_cobranca": "MONTHLY",
                    "titulo": "Profissional",
                    "valor_centavos": 3990,
                    "descricao": "Para barbearias em crescimento.",
                    "checkout_url": "/barbearia/assinatura/checkout",
                },
                {
                    "codigo": "PROFISSIONAL_YEARLY",
                    "plano_tier": "PROFISSIONAL",
                    "ciclo_cobranca": "YEARLY",
                    "titulo": "Profissional",
                    "valor_centavos": 35990,
                    "descricao": "Para barbearias em crescimento.",
                    "checkout_url": "/barbearia/assinatura/checkout",
                },
                {
                    "codigo": "AVANCADO_MONTHLY",
                    "plano_tier": "AVANCADO",
                    "ciclo_cobranca": "MONTHLY",
                    "titulo": "Avançado",
                    "valor_centavos": 4990,
                    "descricao": "Para operações maiores ou em expansão.",
                    "checkout_url": "/barbearia/assinatura/checkout",
                },
                {
                    "codigo": "AVANCADO_YEARLY",
                    "plano_tier": "AVANCADO",
                    "ciclo_cobranca": "YEARLY",
                    "titulo": "Avançado",
                    "valor_centavos": 44990,
                    "descricao": "Para operações maiores ou em expansão.",
                    "checkout_url": "/barbearia/assinatura/checkout",
                },
            ],
            "trial": {
                "dias": 7,
                "habilitado": True,
            },
        }
    )


@barbearia_bp.put("/assinatura")
@auth_required
def update_assinatura():
    if str(getattr(g, "user_role", "")).upper() != "ADMIN":
        return error("Acesso negado", 403)

    payload = request.get_json(silent=True) or {}
    ciclo_cobranca = str(payload.get("ciclo_cobranca") or "").strip().upper()
    if ciclo_cobranca not in ALLOWED_BILLING_CYCLES:
        return error("ciclo_cobranca inválido. Use MONTHLY ou YEARLY", 400)

    iniciar_trial = _parse_bool(payload.get("iniciar_trial"), False)

    item = BarbeariaRepository.update_subscription(g.barbearia_id, ciclo_cobranca, iniciar_trial)
    if not item:
        return error("Barbearia não encontrada", 404)

    return success(item)


@barbearia_bp.post("/assinatura/checkout")
@auth_required
def create_assinatura_checkout():
    """Gera um link de checkout Mercado Pago para assinatura."""
    if str(getattr(g, "user_role", "")).upper() != "ADMIN":
        return error("Acesso negado", 403)

    from backend.services import mercadopago_service as mp

    payload = request.get_json(silent=True) or {}
    ciclo_cobranca = str(payload.get("ciclo_cobranca") or "MONTHLY").strip().upper()
    if ciclo_cobranca not in ALLOWED_BILLING_CYCLES:
        return error("ciclo_cobranca inválido. Use MONTHLY ou YEARLY", 400)
    plano_tier = str(payload.get("plano_tier") or payload.get("plano") or "PROFISSIONAL").strip().upper()
    if plano_tier not in ALLOWED_PLAN_TIERS:
        return error("plano_tier inválido. Use ESSENCIAL, PROFISSIONAL ou AVANCADO", 400)

    barbearia = BarbeariaRepository.get_identity(g.barbearia_id)
    if not barbearia:
        return error("Barbearia não encontrada", 404)

    barbearia_slug = str(barbearia.get("slug") or "").strip()
    payer_email = str(payload.get("email") or "").strip() or None
    frontend_url = str(current_app.config.get("FRONTEND_APP_URL") or "").strip().rstrip("/")
    back_url = f"{frontend_url}/assinatura?status=success" if frontend_url else "https://app.barbeiros.app/assinatura?status=success"

    try:
        result = mp.create_preapproval_link(
            ciclo=ciclo_cobranca,
            payer_email=payer_email,
            barbearia_slug=barbearia_slug,
            back_url=back_url,
            plano_tier=plano_tier,
        )
    except ValueError as exc:
        return error(str(exc), 503)
    except Exception as exc:
        return error(f"Erro ao criar checkout no Mercado Pago: {exc}", 502)

    return success(result)
