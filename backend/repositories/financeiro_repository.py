from datetime import datetime
import time

from flask import current_app

from backend.db import is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready, reset_supabase_client


class FinanceiroRepository(BaseRepository):
    @staticmethod
    def _is_transport_disconnect_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return (
            "server disconnected" in message
            or "remoteprotocolerror" in message
            or "connection reset" in message
            or "read error" in message
            or "timed out" in message
        )

    @staticmethod
    def _execute_with_retry(builder_factory):
        retries = int(current_app.config.get("SUPABASE_TENANT_RETRIES", 3) or 3)
        retries = max(1, retries)
        delay_seconds = 0.25

        last_error = None
        for attempt in range(retries):
            try:
                builder = builder_factory()
                return builder.execute()
            except Exception as exc:
                last_error = exc
                if not FinanceiroRepository._is_transport_disconnect_error(exc):
                    raise

                if attempt >= retries - 1:
                    raise

                reset_supabase_client()
                time.sleep(delay_seconds)

        if last_error:
            raise last_error

    @staticmethod
    def _is_missing_relation_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return (
            "does not exist" in message
            or "undefinedtable" in message
            or ("relation" in message and "financial_" in message)
        )

    @staticmethod
    def list_receivables(barbearia_id: str, status: str | None = None, limit: int = 200):
        FinanceiroRepository.require_tenant(barbearia_id)
        limit = max(1, min(int(limit or 200), 500))

        if is_db_ready():
                        try:
                                if status:
                                        return query_all(
                                                """
                                                SELECT
                                                        fr.id,
                                                        fr.barbearia_id,
                                                        fr.agendamento_id,
                                                        fr.origem,
                                                        fr.descricao,
                                                        fr.status,
                                                        fr.valor_bruto,
                                                        fr.valor_recebido,
                                                        fr.valor_estornado,
                                                        fr.vencimento,
                                                        fr.competencia,
                                                        fr.observacao,
                                                        fr.created_at,
                                                        fr.updated_at,
                                                        c.nome AS cliente_nome,
                                                        s.nome AS servico_nome,
                                                        p.nome AS profissional_nome,
                                                        a.data AS agendamento_data,
                                                        a.hora_inicio AS agendamento_hora_inicio
                                                FROM financial_receivables fr
                                                LEFT JOIN agendamentos a
                                                    ON a.id = fr.agendamento_id AND a.barbearia_id = fr.barbearia_id
                                                LEFT JOIN clientes c
                                                    ON c.id = a.cliente_id AND c.barbearia_id = fr.barbearia_id
                                                LEFT JOIN servicos s
                                                    ON s.id = a.servico_id AND s.barbearia_id = fr.barbearia_id
                                                LEFT JOIN profissionais p
                                                    ON p.id = a.profissional_id AND p.barbearia_id = fr.barbearia_id
                                                WHERE fr.barbearia_id = %s
                                                    AND fr.status = %s
                                                ORDER BY a.data DESC NULLS LAST, a.hora_inicio DESC NULLS LAST, fr.created_at DESC
                                                LIMIT %s
                                                """,
                                                (barbearia_id, status, limit),
                                        )

                                return query_all(
                                        """
                                        SELECT
                                                fr.id,
                                                fr.barbearia_id,
                                                fr.agendamento_id,
                                                fr.origem,
                                                fr.descricao,
                                                fr.status,
                                                fr.valor_bruto,
                                                fr.valor_recebido,
                                                fr.valor_estornado,
                                                fr.vencimento,
                                                fr.competencia,
                                                fr.observacao,
                                                fr.created_at,
                                                fr.updated_at,
                                                c.nome AS cliente_nome,
                                                s.nome AS servico_nome,
                                                p.nome AS profissional_nome,
                                                a.data AS agendamento_data,
                                                a.hora_inicio AS agendamento_hora_inicio
                                        FROM financial_receivables fr
                                        LEFT JOIN agendamentos a
                                            ON a.id = fr.agendamento_id AND a.barbearia_id = fr.barbearia_id
                                        LEFT JOIN clientes c
                                            ON c.id = a.cliente_id AND c.barbearia_id = fr.barbearia_id
                                        LEFT JOIN servicos s
                                            ON s.id = a.servico_id AND s.barbearia_id = fr.barbearia_id
                                        LEFT JOIN profissionais p
                                            ON p.id = a.profissional_id AND p.barbearia_id = fr.barbearia_id
                                        WHERE fr.barbearia_id = %s
                                        ORDER BY a.data DESC NULLS LAST, a.hora_inicio DESC NULLS LAST, fr.created_at DESC
                                        LIMIT %s
                                        """,
                                        (barbearia_id, limit),
                                )
                        except Exception as exc:
                                if not FinanceiroRepository._is_missing_relation_error(exc):
                                        raise

        if is_supabase_ready():
            supabase = get_supabase_client()
            def build_receivables_query():
                dynamic_supabase = get_supabase_client()
                query = (
                    dynamic_supabase.table("financial_receivables")
                    .select(
                        "id,barbearia_id,agendamento_id,origem,descricao,status,valor_bruto,valor_recebido,valor_estornado,vencimento,competencia,observacao,created_at,updated_at"
                    )
                    .eq("barbearia_id", barbearia_id)
                    .order("created_at", desc=True)
                    .limit(limit)
                )
                if status:
                    query = query.eq("status", status)
                return query

            response = FinanceiroRepository._execute_with_retry(build_receivables_query)
            rows = response.data or []
            agendamento_ids = [str(item.get("agendamento_id")) for item in rows if item.get("agendamento_id")]
            if not agendamento_ids:
                return rows

            appointments_response = FinanceiroRepository._execute_with_retry(
                lambda: get_supabase_client()
                .table("agendamentos")
                .select("id,data,hora_inicio,cliente_id,servico_id,profissional_id")
                .eq("barbearia_id", barbearia_id)
                .in_("id", agendamento_ids)
            )
            appointments = appointments_response.data or []
            appointments_by_id = {str(item.get("id")): item for item in appointments}

            cliente_ids = [str(item.get("cliente_id")) for item in appointments if item.get("cliente_id")]
            servico_ids = [str(item.get("servico_id")) for item in appointments if item.get("servico_id")]
            profissional_ids = [str(item.get("profissional_id")) for item in appointments if item.get("profissional_id")]

            clientes_by_id = {}
            if cliente_ids:
                clientes_response = FinanceiroRepository._execute_with_retry(
                    lambda: get_supabase_client()
                    .table("clientes")
                    .select("id,nome")
                    .eq("barbearia_id", barbearia_id)
                    .in_("id", list(set(cliente_ids)))
                )
                clientes_by_id = {str(item.get("id")): item.get("nome") for item in (clientes_response.data or [])}

            servicos_by_id = {}
            if servico_ids:
                servicos_response = FinanceiroRepository._execute_with_retry(
                    lambda: get_supabase_client()
                    .table("servicos")
                    .select("id,nome")
                    .eq("barbearia_id", barbearia_id)
                    .in_("id", list(set(servico_ids)))
                )
                servicos_by_id = {str(item.get("id")): item.get("nome") for item in (servicos_response.data or [])}

            profissionais_by_id = {}
            if profissional_ids:
                profissionais_response = FinanceiroRepository._execute_with_retry(
                    lambda: get_supabase_client()
                    .table("profissionais")
                    .select("id,nome")
                    .eq("barbearia_id", barbearia_id)
                    .in_("id", list(set(profissional_ids)))
                )
                profissionais_by_id = {str(item.get("id")): item.get("nome") for item in (profissionais_response.data or [])}

            for row in rows:
                agendamento_id = str(row.get("agendamento_id") or "")
                appointment = appointments_by_id.get(agendamento_id)
                if not appointment:
                    continue

                row["agendamento_data"] = appointment.get("data")
                row["agendamento_hora_inicio"] = appointment.get("hora_inicio")
                row["cliente_nome"] = clientes_by_id.get(str(appointment.get("cliente_id") or ""))
                row["servico_nome"] = servicos_by_id.get(str(appointment.get("servico_id") or ""))
                row["profissional_nome"] = profissionais_by_id.get(str(appointment.get("profissional_id") or ""))

            return rows

        return []

    @staticmethod
    def get_receivable_by_id(barbearia_id: str, receivable_id: str):
        FinanceiroRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT id, barbearia_id, agendamento_id, origem, descricao, status,
                       valor_bruto, valor_recebido, valor_estornado,
                       vencimento, competencia, observacao, created_at, updated_at
                FROM financial_receivables
                WHERE barbearia_id = %s AND id = %s
                """,
                (barbearia_id, receivable_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("financial_receivables")
                .select(
                    "id,barbearia_id,agendamento_id,origem,descricao,status,valor_bruto,valor_recebido,valor_estornado,vencimento,competencia,observacao,created_at,updated_at"
                )
                .eq("barbearia_id", barbearia_id)
                .eq("id", receivable_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def get_receivable_by_agendamento(barbearia_id: str, agendamento_id: str):
        FinanceiroRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT id, barbearia_id, agendamento_id, origem, descricao, status,
                       valor_bruto, valor_recebido, valor_estornado,
                       vencimento, competencia, observacao, created_at, updated_at
                FROM financial_receivables
                WHERE barbearia_id = %s AND agendamento_id = %s
                """,
                (barbearia_id, agendamento_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("financial_receivables")
                .select(
                    "id,barbearia_id,agendamento_id,origem,descricao,status,valor_bruto,valor_recebido,valor_estornado,vencimento,competencia,observacao,created_at,updated_at"
                )
                .eq("barbearia_id", barbearia_id)
                .eq("agendamento_id", agendamento_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def _status_from_totals(valor_bruto: float, valor_recebido: float, valor_estornado: float) -> str:
        if valor_estornado > 0 and valor_estornado >= valor_recebido:
            return "REFUNDED"

        liquido = max(float(valor_recebido or 0) - float(valor_estornado or 0), 0)
        if liquido <= 0:
            return "OPEN"
        if liquido + 0.00001 >= float(valor_bruto or 0):
            return "PAID"
        return "PARTIAL"

    @staticmethod
    def _get_agendamento_snapshot(barbearia_id: str, agendamento_id: str):
        FinanceiroRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT
                    a.id,
                    a.status,
                    a.data,
                    a.valor_final,
                    COALESCE(s.preco, 0) AS servico_preco,
                    COALESCE(c.nome, 'Cliente') AS cliente_nome,
                    COALESCE(s.nome, 'Serviço') AS servico_nome
                FROM agendamentos a
                LEFT JOIN clientes c
                  ON c.id = a.cliente_id AND c.barbearia_id = a.barbearia_id
                LEFT JOIN servicos s
                  ON s.id = a.servico_id AND s.barbearia_id = a.barbearia_id
                WHERE a.barbearia_id = %s AND a.id = %s
                """,
                (barbearia_id, agendamento_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            apt_response = (
                supabase.table("agendamentos")
                .select("id,status,data,valor_final,cliente_id,servico_id")
                .eq("barbearia_id", barbearia_id)
                .eq("id", agendamento_id)
                .limit(1)
                .execute()
            )
            appointments = apt_response.data or []
            if not appointments:
                return None

            apt = appointments[0]
            cliente_nome = "Cliente"
            servico_nome = "Serviço"
            servico_preco = 0

            if apt.get("cliente_id"):
                cliente_response = (
                    supabase.table("clientes")
                    .select("nome")
                    .eq("barbearia_id", barbearia_id)
                    .eq("id", apt.get("cliente_id"))
                    .limit(1)
                    .execute()
                )
                clientes = cliente_response.data or []
                if clientes:
                    cliente_nome = clientes[0].get("nome") or "Cliente"

            if apt.get("servico_id"):
                servico_response = (
                    supabase.table("servicos")
                    .select("nome,preco")
                    .eq("barbearia_id", barbearia_id)
                    .eq("id", apt.get("servico_id"))
                    .limit(1)
                    .execute()
                )
                servicos = servico_response.data or []
                if servicos:
                    servico_nome = servicos[0].get("nome") or "Serviço"
                    servico_preco = float(servicos[0].get("preco") or 0)

            return {
                "id": apt.get("id"),
                "status": apt.get("status"),
                "data": apt.get("data"),
                "valor_final": apt.get("valor_final"),
                "servico_preco": servico_preco,
                "cliente_nome": cliente_nome,
                "servico_nome": servico_nome,
            }

        return None

    @staticmethod
    def ensure_receivable_for_agendamento(barbearia_id: str, agendamento_id: str):
        FinanceiroRepository.require_tenant(barbearia_id)
        existing = FinanceiroRepository.get_receivable_by_agendamento(barbearia_id, agendamento_id)
        if existing:
            return existing

        snapshot = FinanceiroRepository._get_agendamento_snapshot(barbearia_id, agendamento_id)
        if not snapshot:
            return None

        valor_bruto = float(
            snapshot.get("valor_final")
            if snapshot.get("valor_final") is not None
            else snapshot.get("servico_preco")
            or 0
        )
        descricao = f"{snapshot.get('servico_nome') or 'Serviço'} - {snapshot.get('cliente_nome') or 'Cliente'} ({snapshot.get('data') or ''})"
        competencia = str(snapshot.get("data") or "")[:7] or None

        if is_db_ready():
            return query_one(
                """
                INSERT INTO financial_receivables (
                    barbearia_id,
                    agendamento_id,
                    origem,
                    descricao,
                    status,
                    valor_bruto,
                    valor_recebido,
                    valor_estornado,
                    competencia,
                    vencimento,
                    observacao
                )
                VALUES (%s, %s, 'AGENDAMENTO', %s, 'OPEN', %s, 0, 0, %s, %s, NULL)
                ON CONFLICT (barbearia_id, agendamento_id)
                DO UPDATE SET updated_at = NOW()
                RETURNING id, barbearia_id, agendamento_id, origem, descricao, status,
                          valor_bruto, valor_recebido, valor_estornado,
                          vencimento, competencia, observacao, created_at, updated_at
                """,
                (
                    barbearia_id,
                    agendamento_id,
                    descricao,
                    valor_bruto,
                    competencia,
                    snapshot.get("data"),
                ),
            )

        if is_supabase_ready():
            try:
                response = FinanceiroRepository._execute_with_retry(
                    lambda: get_supabase_client()
                    .table("financial_receivables")
                    .insert(
                        {
                            "barbearia_id": barbearia_id,
                            "agendamento_id": agendamento_id,
                            "origem": "AGENDAMENTO",
                            "descricao": descricao,
                            "status": "OPEN",
                            "valor_bruto": valor_bruto,
                            "valor_recebido": 0,
                            "valor_estornado": 0,
                            "competencia": competencia,
                            "vencimento": snapshot.get("data"),
                        }
                    )
                )
                data = response.data or []
                if data:
                    return data[0]
            except Exception as exc:
                message = str(exc).lower()
                if "duplicate" not in message and "23505" not in message and "unique" not in message:
                    raise

            return FinanceiroRepository.get_receivable_by_agendamento(barbearia_id, agendamento_id)

        return None

    @staticmethod
    def update_receivable_status(barbearia_id: str, receivable_id: str, status: str):
        FinanceiroRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                UPDATE financial_receivables
                SET status = %s,
                    updated_at = NOW()
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, agendamento_id, origem, descricao, status,
                          valor_bruto, valor_recebido, valor_estornado,
                          vencimento, competencia, observacao, created_at, updated_at
                """,
                (status, barbearia_id, receivable_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("financial_receivables")
                .update({"status": status, "updated_at": datetime.utcnow().isoformat()})
                .eq("barbearia_id", barbearia_id)
                .eq("id", receivable_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def add_payment(
        barbearia_id: str,
        receivable_id: str,
        valor: float,
        metodo_pagamento: str,
        recebido_em: str | None,
        created_by_user_id: str | None,
        created_by_role: str | None,
        motivo: str | None = None,
        is_estorno: bool = False,
    ):
        FinanceiroRepository.require_tenant(barbearia_id)
        receivable = FinanceiroRepository.get_receivable_by_id(barbearia_id, receivable_id)
        if not receivable:
            return None, "Recebível não encontrado"

        valor = float(valor or 0)
        if valor <= 0:
            return None, "valor deve ser maior que zero"

        valor_bruto = float(receivable.get("valor_bruto") or 0)
        valor_recebido = float(receivable.get("valor_recebido") or 0)
        valor_estornado = float(receivable.get("valor_estornado") or 0)

        if is_estorno:
            max_estorno = max(valor_recebido - valor_estornado, 0)
            if valor > max_estorno + 0.00001:
                return None, "valor de estorno maior que o recebido"
            novo_estornado = valor_estornado + valor
            novo_recebido = valor_recebido
        else:
            novo_recebido = valor_recebido + valor
            novo_estornado = valor_estornado

        novo_status = FinanceiroRepository._status_from_totals(valor_bruto, novo_recebido, novo_estornado)

        if is_db_ready():
            payment = query_one(
                """
                INSERT INTO financial_receivable_payments (
                    barbearia_id,
                    receivable_id,
                    agendamento_id,
                    valor,
                    metodo_pagamento,
                    recebido_em,
                    motivo,
                    is_estorno,
                    created_by_user_id,
                    created_by_role
                )
                VALUES (%s, %s, %s, %s, %s, COALESCE(%s::timestamptz, NOW()), %s, %s, %s, %s)
                RETURNING id, barbearia_id, receivable_id, agendamento_id, valor, metodo_pagamento,
                          recebido_em, motivo, is_estorno, created_by_user_id, created_by_role, created_at
                """,
                (
                    barbearia_id,
                    receivable_id,
                    receivable.get("agendamento_id"),
                    valor,
                    metodo_pagamento,
                    recebido_em,
                    motivo,
                    is_estorno,
                    created_by_user_id,
                    created_by_role,
                ),
            )

            updated = query_one(
                """
                UPDATE financial_receivables
                SET valor_recebido = %s,
                    valor_estornado = %s,
                    status = %s,
                    updated_at = NOW()
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, agendamento_id, origem, descricao, status,
                          valor_bruto, valor_recebido, valor_estornado,
                          vencimento, competencia, observacao, created_at, updated_at
                """,
                (novo_recebido, novo_estornado, novo_status, barbearia_id, receivable_id),
            )

            entry_type = "REFUND" if is_estorno else "INCOME"
            entry_amount = valor
            entry_description = "Estorno de recebimento" if is_estorno else "Recebimento"
            query_one(
                """
                INSERT INTO financial_entries (
                    barbearia_id,
                    tipo,
                    origem_tipo,
                    origem_id,
                    agendamento_id,
                    descricao,
                    valor,
                    ocorrido_em
                )
                VALUES (%s, %s, 'RECEIVABLE_PAYMENT', %s, %s, %s, %s, COALESCE(%s::timestamptz, NOW()))
                RETURNING id
                """,
                (
                    barbearia_id,
                    entry_type,
                    payment.get("id") if payment else None,
                    receivable.get("agendamento_id"),
                    entry_description,
                    entry_amount,
                    recebido_em,
                ),
            )

            return {"payment": payment, "receivable": updated}, None

        if is_supabase_ready():
            supabase = get_supabase_client()
            payment_response = (
                supabase.table("financial_receivable_payments")
                .insert(
                    {
                        "barbearia_id": barbearia_id,
                        "receivable_id": receivable_id,
                        "agendamento_id": receivable.get("agendamento_id"),
                        "valor": valor,
                        "metodo_pagamento": metodo_pagamento,
                        "recebido_em": recebido_em or datetime.utcnow().isoformat(),
                        "motivo": motivo,
                        "is_estorno": is_estorno,
                        "created_by_user_id": created_by_user_id,
                        "created_by_role": created_by_role,
                    }
                )
                .execute()
            )
            payments = payment_response.data or []
            payment = payments[0] if payments else None

            updated_response = (
                supabase.table("financial_receivables")
                .update(
                    {
                        "valor_recebido": novo_recebido,
                        "valor_estornado": novo_estornado,
                        "status": novo_status,
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                )
                .eq("barbearia_id", barbearia_id)
                .eq("id", receivable_id)
                .execute()
            )
            updated_rows = updated_response.data or []
            updated = updated_rows[0] if updated_rows else None

            if payment:
                entry_type = "REFUND" if is_estorno else "INCOME"
                entry_description = "Estorno de recebimento" if is_estorno else "Recebimento"
                (
                    supabase.table("financial_entries")
                    .insert(
                        {
                            "barbearia_id": barbearia_id,
                            "tipo": entry_type,
                            "origem_tipo": "RECEIVABLE_PAYMENT",
                            "origem_id": payment.get("id"),
                            "agendamento_id": receivable.get("agendamento_id"),
                            "descricao": entry_description,
                            "valor": valor,
                            "ocorrido_em": recebido_em or datetime.utcnow().isoformat(),
                        }
                    )
                    .execute()
                )

            return {"payment": payment, "receivable": updated}, None

        return None, "Banco de dados indisponível"

    @staticmethod
    def mark_receivable_cancelled_if_unpaid(barbearia_id: str, agendamento_id: str):
        receivable = FinanceiroRepository.get_receivable_by_agendamento(barbearia_id, agendamento_id)
        if not receivable:
            return None

        if float(receivable.get("valor_recebido") or 0) > 0:
            return receivable

        return FinanceiroRepository.update_receivable_status(barbearia_id, str(receivable.get("id")), "CANCELLED")

    @staticmethod
    def reopen_cancelled_receivable_if_unpaid(barbearia_id: str, agendamento_id: str):
        receivable = FinanceiroRepository.get_receivable_by_agendamento(barbearia_id, agendamento_id)
        if not receivable:
            return None

        if str(receivable.get("status") or "") != "CANCELLED":
            return receivable

        if float(receivable.get("valor_recebido") or 0) > 0:
            return receivable

        return FinanceiroRepository.update_receivable_status(barbearia_id, str(receivable.get("id")), "OPEN")

    @staticmethod
    def summary(barbearia_id: str):
        FinanceiroRepository.require_tenant(barbearia_id)

        if is_db_ready():
            try:
                row = query_one(
                    """
                    SELECT
                      COUNT(*)::int AS total_recebiveis,
                      COALESCE(SUM(CASE WHEN status IN ('OPEN', 'PARTIAL') THEN (valor_bruto - valor_recebido + valor_estornado) ELSE 0 END), 0) AS a_receber,
                      COALESCE(SUM(CASE WHEN status IN ('PAID', 'PARTIAL', 'REFUNDED') THEN valor_recebido END), 0) AS recebido_bruto,
                      COALESCE(SUM(valor_estornado), 0) AS estornado,
                      COALESCE(SUM(CASE WHEN status = 'PAID' THEN valor_bruto ELSE 0 END), 0) AS quitado
                    FROM financial_receivables
                    WHERE barbearia_id = %s
                    """,
                    (barbearia_id,),
                )
                if not row:
                    return {
                        "total_recebiveis": 0,
                        "a_receber": 0,
                        "recebido_bruto": 0,
                        "estornado": 0,
                        "recebido_liquido": 0,
                        "quitado": 0,
                    }

                recebido_bruto = float(row.get("recebido_bruto") or 0)
                estornado = float(row.get("estornado") or 0)
                return {
                    "total_recebiveis": int(row.get("total_recebiveis") or 0),
                    "a_receber": float(row.get("a_receber") or 0),
                    "recebido_bruto": recebido_bruto,
                    "estornado": estornado,
                    "recebido_liquido": recebido_bruto - estornado,
                    "quitado": float(row.get("quitado") or 0),
                }
            except Exception as exc:
                if not FinanceiroRepository._is_missing_relation_error(exc):
                    raise

        if is_supabase_ready():
            rows = FinanceiroRepository.list_receivables(barbearia_id, None, 500)
            total_recebiveis = len(rows)
            a_receber = 0.0
            recebido_bruto = 0.0
            estornado = 0.0
            quitado = 0.0

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

            return {
                "total_recebiveis": total_recebiveis,
                "a_receber": a_receber,
                "recebido_bruto": recebido_bruto,
                "estornado": estornado,
                "recebido_liquido": recebido_bruto - estornado,
                "quitado": quitado,
            }

        return {
            "total_recebiveis": 0,
            "a_receber": 0,
            "recebido_bruto": 0,
            "estornado": 0,
            "recebido_liquido": 0,
            "quitado": 0,
        }
