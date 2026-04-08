from __future__ import annotations

import time

from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.repositories.clientes_assinaturas_repository import ClientesAssinaturasRepository
from backend.utils.http import error, success

clientes_assinaturas_bp = Blueprint("clientes_assinaturas", __name__, url_prefix="/clientes")


def _run_with_transient_retry(operation, attempts: int = 3, sleep_seconds: float = 0.25):
    last_exc: Exception | None = None
    for attempt in range(max(1, attempts)):
        try:
            return operation(), None
        except Exception as exc:
            last_exc = exc
            if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
                raise
            if ClientesAssinaturasRepository._is_transient_connection_error(exc) and attempt < (attempts - 1):
                time.sleep(sleep_seconds)
                continue
            break
    return None, last_exc


def _parse_centavos(value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _validate_plan_services(payload_services):
    if not isinstance(payload_services, list) or not payload_services:
        return None, "servicos deve ser um array não vazio"

    normalized = []
    seen = set()
    for item in payload_services:
        servico_id = str((item or {}).get("servico_id") or "").strip()
        qtd_raw = (item or {}).get("quantidade_mensal")
        try:
            qtd = int(qtd_raw)
        except (TypeError, ValueError):
            return None, "quantidade_mensal inválida"

        if not servico_id or qtd <= 0:
            return None, "cada serviço deve ter servico_id e quantidade_mensal > 0"
        if servico_id in seen:
            return None, "não repita o mesmo serviço no plano"

        seen.add(servico_id)
        normalized.append({"servico_id": servico_id, "quantidade_mensal": qtd})

    return normalized, None


@clientes_assinaturas_bp.get("/assinaturas/planos")
@auth_required
def list_planos_assinatura_cliente():
    try:
        planos = ClientesAssinaturasRepository.list_planos(g.barbearia_id)
        return success(planos)
    except Exception as exc:
        if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
            return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)
        return error("Falha ao listar planos de assinatura", 500)


@clientes_assinaturas_bp.get("/assinaturas/clientes")
@auth_required
def list_clientes_com_assinatura():
    try:
        rows, transient_exc = _run_with_transient_retry(
            lambda: ClientesAssinaturasRepository.list_clientes_com_assinatura(g.barbearia_id)
        )
        if transient_exc is not None:
            raise transient_exc
        return success(rows)
    except Exception as exc:
        if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
            return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)
        return error(f"Falha ao listar clientes com assinatura: {str(exc)}", 500)


@clientes_assinaturas_bp.post("/assinaturas/planos")
@auth_required
def create_plano_assinatura_cliente():
    payload = request.get_json(silent=True) or {}
    nome = str(payload.get("nome") or "").strip()
    descricao = str(payload.get("descricao") or "").strip() or None
    valor = _parse_centavos(payload.get("valor_mensal_centavos"))
    dias_carencia_raw = payload.get("dias_carencia", 7)

    if not nome:
        return error("nome é obrigatório", 400)
    if not valor:
        return error("valor_mensal_centavos deve ser inteiro > 0", 400)

    try:
        dias_carencia = int(dias_carencia_raw)
    except (TypeError, ValueError):
        return error("dias_carencia inválido", 400)

    if dias_carencia < 0 or dias_carencia > 30:
        return error("dias_carencia deve estar entre 0 e 30", 400)

    servicos, validation_error = _validate_plan_services(payload.get("servicos"))
    if validation_error:
        return error(validation_error, 400)

    try:
        created = ClientesAssinaturasRepository.create_plano(
            g.barbearia_id,
            nome,
            descricao,
            valor,
            dias_carencia,
            servicos,
        )
    except Exception as exc:
        if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
            return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)
        return error(f"Falha ao criar plano: {str(exc)}", 500)

    if not created:
        return error("Falha ao criar plano", 500)

    return success(created, 201)


@clientes_assinaturas_bp.put("/assinaturas/planos/<plano_id>")
@auth_required
def update_plano_assinatura_cliente(plano_id: str):
    payload = request.get_json(silent=True) or {}
    nome = str(payload.get("nome") or "").strip()
    descricao = str(payload.get("descricao") or "").strip() or None
    valor = _parse_centavos(payload.get("valor_mensal_centavos"))
    ativo = bool(payload.get("ativo", True))

    if not nome:
        return error("nome é obrigatório", 400)
    if not valor:
        return error("valor_mensal_centavos deve ser inteiro > 0", 400)

    try:
        dias_carencia = int(payload.get("dias_carencia", 7))
    except (TypeError, ValueError):
        return error("dias_carencia inválido", 400)

    if dias_carencia < 0 or dias_carencia > 30:
        return error("dias_carencia deve estar entre 0 e 30", 400)

    servicos, validation_error = _validate_plan_services(payload.get("servicos"))
    if validation_error:
        return error(validation_error, 400)

    try:
        updated = ClientesAssinaturasRepository.update_plano(
            g.barbearia_id,
            plano_id,
            nome,
            descricao,
            valor,
            dias_carencia,
            ativo,
            servicos,
        )
    except Exception as exc:
        if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
            return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)
        return error(f"Falha ao atualizar plano: {str(exc)}", 500)

    if not updated:
        return error("Plano não encontrado", 404)

    return success(updated)


@clientes_assinaturas_bp.delete("/assinaturas/planos/<plano_id>")
@auth_required
def delete_plano_assinatura_cliente(plano_id: str):
    try:
        deleted, err = ClientesAssinaturasRepository.delete_plano(g.barbearia_id, plano_id)
    except Exception as exc:
        if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
            return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)
        return error(f"Falha ao excluir plano: {str(exc)}", 500)

    if err:
        return error(err, 409)

    if not deleted:
        return error("Plano não encontrado", 404)

    return success({"id": str(deleted.get("id"))})


@clientes_assinaturas_bp.get("/<cliente_id>/assinatura")
@auth_required
def get_assinatura_cliente(cliente_id: str):
    assinatura = None
    last_exc: Exception | None = None

    for attempt in range(3):
        try:
            assinatura = ClientesAssinaturasRepository.get_assinatura_cliente(g.barbearia_id, cliente_id)
            last_exc = None
            break
        except Exception as exc:
            last_exc = exc
            if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
                return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)

            if ClientesAssinaturasRepository._is_transient_connection_error(exc) and attempt < 2:
                time.sleep(0.25)
                continue

            return error(f"Falha ao carregar assinatura: {str(exc)}", 500)

    if last_exc is not None:
        return error(f"Falha ao carregar assinatura: {str(last_exc)}", 500)

    if not assinatura:
        return success(None)

    return success(assinatura)


@clientes_assinaturas_bp.put("/<cliente_id>/assinatura")
@auth_required
def upsert_assinatura_cliente(cliente_id: str):
    payload = request.get_json(silent=True) or {}
    plano_id = str(payload.get("plano_id") or "").strip()
    if not plano_id:
        return error("plano_id é obrigatório", 400)

    try:
        assinatura, err = ClientesAssinaturasRepository.ativar_assinatura(
            g.barbearia_id,
            cliente_id,
            plano_id,
            None,
        )
    except Exception as exc:
        if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
            return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)
        return error(f"Falha ao ativar assinatura: {str(exc)}", 500)

    if err:
        return error(err, 400)

    full = ClientesAssinaturasRepository.get_assinatura_cliente(g.barbearia_id, cliente_id)
    return success(full or assinatura)


@clientes_assinaturas_bp.delete("/<cliente_id>/assinatura")
@auth_required
def cancel_assinatura_cliente(cliente_id: str):
    payload = request.get_json(silent=True) or {}
    motivo = str(payload.get("motivo") or "").strip() or "Cancelada manualmente"

    try:
        cancelled = ClientesAssinaturasRepository.cancelar_assinatura(g.barbearia_id, cliente_id, motivo)
    except Exception as exc:
        if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
            return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)
        return error(f"Falha ao cancelar assinatura: {str(exc)}", 500)

    if not cancelled:
        return error("Cliente sem assinatura ativa", 404)

    return success(cancelled)


@clientes_assinaturas_bp.patch("/<cliente_id>/assinatura/status")
@auth_required
def update_status_assinatura_cliente(cliente_id: str):
    payload = request.get_json(silent=True) or {}
    status = str(payload.get("status") or "").strip().upper()
    motivo = str(payload.get("motivo") or "").strip() or None

    if not status:
        return error("status é obrigatório", 400)

    if status not in {"ACTIVE", "PAUSED"}:
        return error("status deve ser ACTIVE ou PAUSED", 400)

    try:
        updated, err = ClientesAssinaturasRepository.atualizar_status_assinatura(
            g.barbearia_id,
            cliente_id,
            status,
            motivo,
        )
    except Exception as exc:
        if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
            return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)
        return error(f"Falha ao atualizar status da assinatura: {str(exc)}", 500)

    if err:
        return error(err, 400)

    return success(updated)


@clientes_assinaturas_bp.post("/<cliente_id>/assinatura/pagamentos")
@auth_required
def create_pagamento_assinatura_cliente(cliente_id: str):
    payload = request.get_json(silent=True) or {}
    metodo = str(payload.get("metodo") or "").strip()
    observacao = str(payload.get("observacao") or "").strip() or None
    amount_raw = payload.get("amount_centavos")

    if not metodo:
        return error("metodo é obrigatório", 400)

    try:
        amount_centavos = int(amount_raw) if amount_raw is not None else 0
    except (TypeError, ValueError):
        return error("amount_centavos inválido", 400)

    try:
        payment, err = ClientesAssinaturasRepository.registrar_pagamento_manual(
            g.barbearia_id,
            cliente_id,
            amount_centavos,
            metodo,
            observacao,
            str(getattr(g, "user_id", "")) or None,
            str(getattr(g, "user_role", "")) or None,
        )
    except Exception as exc:
        if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
            return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)
        return error(f"Falha ao registrar pagamento: {str(exc)}", 500)

    if err:
        return error(err, 400)

    return success(payment, 201)


@clientes_assinaturas_bp.get("/<cliente_id>/assinatura/pagamentos")
@auth_required
def list_pagamentos_assinatura_cliente(cliente_id: str):
    try:
        pagamentos, transient_exc = _run_with_transient_retry(
            lambda: ClientesAssinaturasRepository.list_pagamentos_assinatura(g.barbearia_id, cliente_id)
        )
        if transient_exc is not None:
            raise transient_exc
        return success(pagamentos)
    except Exception as exc:
        if ClientesAssinaturasRepository._is_missing_table_or_column(exc):
            return error("Módulo de assinaturas B2C não migrado. Rode a migration 025.", 503)
        return error(f"Falha ao listar pagamentos: {str(exc)}", 500)
