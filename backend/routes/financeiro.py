from datetime import datetime
import logging

from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.repositories.barbearia_repository import BarbeariaRepository
from backend.repositories.financeiro_repository import FinanceiroRepository
from backend.utils.http import error, success

financeiro_bp = Blueprint("financeiro", __name__)
logger = logging.getLogger(__name__)


def _is_admin() -> bool:
    return str(getattr(g, "user_role", "")).upper() == "ADMIN"


def _is_employee() -> bool:
    return str(getattr(g, "user_role", "")).upper() == "EMPLOYEE"


def _employee_can_view_finance() -> bool:
    try:
        identity = BarbeariaRepository.get_identity(g.barbearia_id)
        return bool((identity or {}).get("allow_employee_view_finance", False))
    except Exception:
        return False


def _admin_guard():
    if not _is_admin():
        return error("Somente administradores podem acessar o financeiro", 403)
    return None


def _finance_read_guard():
    if _is_admin():
        return None
    if _is_employee() and _employee_can_view_finance():
        return None
    return error("Acesso negado ao financeiro", 403)


@financeiro_bp.get("/financeiro/resumo")
@auth_required
def get_financeiro_resumo():
    denied = _finance_read_guard()
    if denied:
        return denied

    try:
        if _is_admin():
            resumo = FinanceiroRepository.summary(g.barbearia_id)
        else:
            rows = FinanceiroRepository.list_receivables(
                g.barbearia_id,
                str(getattr(g, "user_id", "")) or None,
                None,
                None,
                500,
            )
            total_recebiveis = len(rows)
            a_receber = 0.0
            recebido_bruto = 0.0
            estornado = 0.0
            quitado = 0.0
            comissao_estimada = 0.0

            for row in rows:
                valor_bruto = float(row.get("valor_bruto") or 0)
                valor_recebido = float(row.get("valor_recebido") or 0)
                valor_estornado = float(row.get("valor_estornado") or 0)
                status = str(row.get("status") or "")

                if status in {"OPEN", "PARTIAL"}:
                    a_receber += max(valor_bruto - valor_recebido + valor_estornado, 0)
                if status in {"PAID", "PARTIAL", "REFUNDED"}:
                    recebido_bruto += valor_recebido
                if status == "PAID":
                    quitado += valor_bruto
                estornado += valor_estornado
                comissao_estimada += float(row.get("comissao_estimada") or 0)

            resumo = {
                "total_recebiveis": total_recebiveis,
                "a_receber": a_receber,
                "recebido_bruto": recebido_bruto,
                "estornado": estornado,
                "recebido_liquido": recebido_bruto - estornado,
                "quitado": quitado,
                "comissao_estimada": comissao_estimada,
            }
    except Exception as exc:
        logger.warning("Falha ao obter resumo financeiro para barbearia_id=%s: %s", g.barbearia_id, exc)
        resumo = {
            "total_recebiveis": 0,
            "a_receber": 0,
            "recebido_bruto": 0,
            "estornado": 0,
            "recebido_liquido": 0,
            "quitado": 0,
            "comissao_estimada": 0,
        }
    return success(resumo)


@financeiro_bp.get("/financeiro/recebiveis")
@auth_required
def list_recebiveis():
    denied = _finance_read_guard()
    if denied:
        return denied

    profissional_id = (request.args.get("profissional_id") or "").strip() or None
    if _is_employee():
        profissional_id = str(getattr(g, "user_id", "")) or None
    data_inicio = (request.args.get("data_inicio") or "").strip() or None
    data_fim = (request.args.get("data_fim") or "").strip() or None
    raw_limit = request.args.get("limit") or "200"

    if data_inicio:
        try:
            datetime.strptime(data_inicio, "%Y-%m-%d")
        except ValueError:
            return error("data_inicio inválida. Use YYYY-MM-DD", 400)

    if data_fim:
        try:
            datetime.strptime(data_fim, "%Y-%m-%d")
        except ValueError:
            return error("data_fim inválida. Use YYYY-MM-DD", 400)

    if data_inicio and data_fim and data_inicio > data_fim:
        return error("intervalo de datas inválido", 400)

    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return error("limit inválido", 400)

    try:
        rows = FinanceiroRepository.list_receivables(
            g.barbearia_id,
            profissional_id,
            data_inicio,
            data_fim,
            limit,
        )
    except Exception as exc:
        logger.warning("Falha ao listar recebíveis para barbearia_id=%s: %s", g.barbearia_id, exc)
        rows = []
    return success(rows)


@financeiro_bp.post("/financeiro/recebiveis/<receivable_id>/pagamentos")
@auth_required
def create_pagamento(receivable_id: str):
    denied = _admin_guard()
    if denied:
        return denied

    payload = request.get_json(silent=True) or {}

    valor_raw = payload.get("valor")
    metodo_pagamento = (payload.get("metodo_pagamento") or "").strip().upper()
    recebido_em = (payload.get("recebido_em") or "").strip() or None
    motivo = (payload.get("motivo") or "").strip() or None

    if not metodo_pagamento:
        return error("metodo_pagamento é obrigatório", 400)

    try:
        valor = float(valor_raw)
    except (TypeError, ValueError):
        return error("valor inválido", 400)

    if recebido_em:
        try:
            datetime.fromisoformat(recebido_em.replace("Z", "+00:00"))
        except ValueError:
            return error("recebido_em inválido. Use ISO-8601", 400)

    result, err = FinanceiroRepository.add_payment(
        g.barbearia_id,
        receivable_id,
        valor,
        metodo_pagamento,
        recebido_em,
        str(getattr(g, "user_id", "")) or None,
        str(getattr(g, "user_role", "")) or None,
        motivo,
        False,
    )
    if err:
        return error(err, 400)

    return success(result, 201)


@financeiro_bp.post("/financeiro/recebiveis/<receivable_id>/estorno")
@auth_required
def create_estorno(receivable_id: str):
    denied = _admin_guard()
    if denied:
        return denied

    payload = request.get_json(silent=True) or {}

    valor_raw = payload.get("valor")
    motivo = (payload.get("motivo") or "").strip()
    recebido_em = (payload.get("recebido_em") or "").strip() or None

    if not motivo:
        return error("motivo é obrigatório para estorno", 400)

    try:
        valor = float(valor_raw)
    except (TypeError, ValueError):
        return error("valor inválido", 400)

    if recebido_em:
        try:
            datetime.fromisoformat(recebido_em.replace("Z", "+00:00"))
        except ValueError:
            return error("recebido_em inválido. Use ISO-8601", 400)

    result, err = FinanceiroRepository.add_payment(
        g.barbearia_id,
        receivable_id,
        valor,
        "ESTORNO",
        recebido_em,
        str(getattr(g, "user_id", "")) or None,
        str(getattr(g, "user_role", "")) or None,
        motivo,
        True,
    )
    if err:
        return error(err, 400)

    return success(result, 201)
