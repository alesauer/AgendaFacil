from datetime import datetime, timezone

from backend.db import is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class AgendamentosRepository(BaseRepository):
    @staticmethod
    def list_by_client(barbearia_id: str, cliente_id: str):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT id, barbearia_id, cliente_id, profissional_id, servico_id,
                       data, hora_inicio, hora_fim, status,
                       valor_final, forma_pagamento, pago_em, desconto,
                       cortesia, estornado, concluido_operacional_em, concluido_financeiro_em
                FROM agendamentos
                WHERE barbearia_id = %s
                  AND cliente_id = %s
                ORDER BY data DESC, hora_inicio DESC
                """,
                (barbearia_id, cliente_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .select("id,barbearia_id,cliente_id,profissional_id,servico_id,data,hora_inicio,hora_fim,status,valor_final,forma_pagamento,pago_em,desconto,cortesia,estornado,concluido_operacional_em,concluido_financeiro_em")
                .eq("barbearia_id", barbearia_id)
                .eq("cliente_id", cliente_id)
                .order("data", desc=True)
                .order("hora_inicio", desc=True)
                .execute()
            )
            return response.data or []

        return []

    @staticmethod
    def get_agendamento_by_id(barbearia_id: str, agendamento_id: str):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT id, barbearia_id, cliente_id, profissional_id, servico_id,
                       data, hora_inicio, hora_fim, status,
                       valor_final, forma_pagamento, pago_em, desconto,
                       cortesia, estornado, concluido_operacional_em, concluido_financeiro_em
                FROM agendamentos
                WHERE barbearia_id = %s AND id = %s
                """,
                (barbearia_id, agendamento_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .select("id,barbearia_id,cliente_id,profissional_id,servico_id,data,hora_inicio,hora_fim,status,valor_final,forma_pagamento,pago_em,desconto,cortesia,estornado,concluido_operacional_em,concluido_financeiro_em")
                .eq("barbearia_id", barbearia_id)
                .eq("id", agendamento_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def get_bloqueio_by_id(barbearia_id: str, bloqueio_id: str):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT id, barbearia_id, profissional_id
                FROM bloqueios
                WHERE barbearia_id = %s AND id = %s
                """,
                (barbearia_id, bloqueio_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("bloqueios")
                .select("id,barbearia_id,profissional_id")
                .eq("barbearia_id", barbearia_id)
                .eq("id", bloqueio_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def list_by_date(barbearia_id: str, profissional_id: str, data: str):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT id, barbearia_id, cliente_id, profissional_id, servico_id,
                      data, hora_inicio, hora_fim, status,
                      valor_final, forma_pagamento, pago_em, desconto,
                      cortesia, estornado, concluido_operacional_em, concluido_financeiro_em
                FROM agendamentos
                WHERE barbearia_id = %s
                  AND profissional_id = %s
                  AND data = %s
                  AND status <> 'CANCELLED'
                ORDER BY hora_inicio
                """,
                (barbearia_id, profissional_id, data),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .select("id,barbearia_id,cliente_id,profissional_id,servico_id,data,hora_inicio,hora_fim,status,valor_final,forma_pagamento,pago_em,desconto,cortesia,estornado,concluido_operacional_em,concluido_financeiro_em")
                .eq("barbearia_id", barbearia_id)
                .eq("profissional_id", profissional_id)
                .eq("data", data)
                .neq("status", "CANCELLED")
                .order("hora_inicio")
                .execute()
            )
            return response.data or []

        return []

    @staticmethod
    def list_bloqueios_by_date(barbearia_id: str, profissional_id: str, data: str):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT id, hora_inicio, hora_fim
                FROM bloqueios
                WHERE barbearia_id = %s
                  AND profissional_id = %s
                  AND data = %s
                ORDER BY hora_inicio
                """,
                (barbearia_id, profissional_id, data),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("bloqueios")
                .select("id,hora_inicio,hora_fim")
                .eq("barbearia_id", barbearia_id)
                .eq("profissional_id", profissional_id)
                .eq("data", data)
                .order("hora_inicio")
                .execute()
            )
            return response.data or []

        return []

    @staticmethod
    def create(
        barbearia_id: str,
        cliente_id: str,
        profissional_id: str,
        servico_id: str,
        data: str,
        hora_inicio: str,
        hora_fim: str,
        status: str,
    ):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                INSERT INTO agendamentos (
                    barbearia_id, cliente_id, profissional_id, servico_id,
                    data, hora_inicio, hora_fim, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, barbearia_id, cliente_id, profissional_id, servico_id,
                          data, hora_inicio, hora_fim, status,
                          valor_final, forma_pagamento, pago_em, desconto,
                          cortesia, estornado, concluido_operacional_em, concluido_financeiro_em
                """,
                (
                    barbearia_id,
                    cliente_id,
                    profissional_id,
                    servico_id,
                    data,
                    hora_inicio,
                    hora_fim,
                    status,
                ),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .insert(
                    {
                        "barbearia_id": barbearia_id,
                        "cliente_id": cliente_id,
                        "profissional_id": profissional_id,
                        "servico_id": servico_id,
                        "data": data,
                        "hora_inicio": hora_inicio,
                        "hora_fim": hora_fim,
                        "status": status,
                    }
                )
                .execute()
            )
            data_response = response.data or []
            return data_response[0] if data_response else None

        return None

    @staticmethod
    def update(
        barbearia_id: str,
        agendamento_id: str,
        cliente_id: str,
        profissional_id: str,
        servico_id: str,
        data: str,
        hora_inicio: str,
        hora_fim: str,
        status: str,
    ):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                UPDATE agendamentos
                SET cliente_id = %s,
                    profissional_id = %s,
                    servico_id = %s,
                    data = %s,
                    hora_inicio = %s,
                    hora_fim = %s,
                    status = %s
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, cliente_id, profissional_id, servico_id,
                          data, hora_inicio, hora_fim, status,
                          valor_final, forma_pagamento, pago_em, desconto,
                          cortesia, estornado, concluido_operacional_em, concluido_financeiro_em
                """,
                (
                    cliente_id,
                    profissional_id,
                    servico_id,
                    data,
                    hora_inicio,
                    hora_fim,
                    status,
                    barbearia_id,
                    agendamento_id,
                ),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .update(
                    {
                        "cliente_id": cliente_id,
                        "profissional_id": profissional_id,
                        "servico_id": servico_id,
                        "data": data,
                        "hora_inicio": hora_inicio,
                        "hora_fim": hora_fim,
                        "status": status,
                    }
                )
                .eq("barbearia_id", barbearia_id)
                .eq("id", agendamento_id)
                .execute()
            )
            data_response = response.data or []
            return data_response[0] if data_response else None

        return None

    @staticmethod
    def list_all(barbearia_id: str):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT
                    id::text AS id,
                    barbearia_id::text AS barbearia_id,
                    cliente_id::text AS cliente_id,
                    profissional_id::text AS profissional_id,
                    servico_id::text AS servico_id,
                    data::text AS data,
                    hora_inicio::text AS hora_inicio,
                    hora_fim::text AS hora_fim,
                    status,
                    valor_final,
                    forma_pagamento,
                    pago_em,
                    desconto,
                    cortesia,
                    estornado,
                    concluido_operacional_em,
                    concluido_financeiro_em,
                    NULL::text AS block_reason,
                    false AS is_bloqueio
                FROM agendamentos
                WHERE barbearia_id = %s

                UNION ALL

                SELECT
                    ('bloqueio:' || id::text) AS id,
                    barbearia_id::text AS barbearia_id,
                    'blocked'::text AS cliente_id,
                    profissional_id::text AS profissional_id,
                    'blocked'::text AS servico_id,
                    data::text AS data,
                    hora_inicio::text AS hora_inicio,
                    hora_fim::text AS hora_fim,
                    'BLOCKED'::text AS status,
                    NULL::numeric AS valor_final,
                    NULL::text AS forma_pagamento,
                    NULL::timestamptz AS pago_em,
                    0::numeric AS desconto,
                    false AS cortesia,
                    false AS estornado,
                    NULL::timestamptz AS concluido_operacional_em,
                    NULL::timestamptz AS concluido_financeiro_em,
                    motivo AS block_reason,
                    true AS is_bloqueio
                FROM bloqueios
                WHERE barbearia_id = %s

                ORDER BY data DESC, hora_inicio DESC
                """,
                (barbearia_id, barbearia_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            agendamentos_response = (
                supabase.table("agendamentos")
                .select("id,barbearia_id,cliente_id,profissional_id,servico_id,data,hora_inicio,hora_fim,status,valor_final,forma_pagamento,pago_em,desconto,cortesia,estornado,concluido_operacional_em,concluido_financeiro_em")
                .eq("barbearia_id", barbearia_id)
                .order("data", desc=True)
                .order("hora_inicio", desc=True)
                .execute()
            )

            bloqueios_response = (
                supabase.table("bloqueios")
                .select("id,barbearia_id,profissional_id,data,hora_inicio,hora_fim,motivo")
                .eq("barbearia_id", barbearia_id)
                .order("data", desc=True)
                .order("hora_inicio", desc=True)
                .execute()
            )

            agendamentos = agendamentos_response.data or []
            bloqueios = bloqueios_response.data or []
            bloqueios_mapeados = [
                {
                    "id": f"bloqueio:{item['id']}",
                    "barbearia_id": item["barbearia_id"],
                    "cliente_id": "blocked",
                    "profissional_id": item["profissional_id"],
                    "servico_id": "blocked",
                    "data": item["data"],
                    "hora_inicio": item["hora_inicio"],
                    "hora_fim": item["hora_fim"],
                    "status": "BLOCKED",
                    "valor_final": None,
                    "forma_pagamento": None,
                    "pago_em": None,
                    "desconto": 0,
                    "cortesia": False,
                    "estornado": False,
                    "concluido_operacional_em": None,
                    "concluido_financeiro_em": None,
                    "block_reason": item.get("motivo"),
                    "is_bloqueio": True,
                }
                for item in bloqueios
            ]

            agendamentos_mapeados = [
                {
                    **item,
                    "block_reason": None,
                    "is_bloqueio": False,
                }
                for item in agendamentos
            ]

            merged = agendamentos_mapeados + bloqueios_mapeados
            merged.sort(key=lambda item: (str(item.get("data", "")), str(item.get("hora_inicio", ""))), reverse=True)
            return merged

        return []

    @staticmethod
    def create_bloqueio(
        barbearia_id: str,
        profissional_id: str,
        data: str,
        hora_inicio: str,
        hora_fim: str,
        motivo: str | None,
    ):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                INSERT INTO bloqueios (
                    barbearia_id, profissional_id, data, hora_inicio, hora_fim, motivo
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, barbearia_id, profissional_id, data, hora_inicio, hora_fim, motivo
                """,
                (barbearia_id, profissional_id, data, hora_inicio, hora_fim, motivo),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("bloqueios")
                .insert(
                    {
                        "barbearia_id": barbearia_id,
                        "profissional_id": profissional_id,
                        "data": data,
                        "hora_inicio": hora_inicio,
                        "hora_fim": hora_fim,
                        "motivo": motivo,
                    }
                )
                .execute()
            )
            data_response = response.data or []
            return data_response[0] if data_response else None

        return None

    @staticmethod
    def update_bloqueio(
        barbearia_id: str,
        bloqueio_id: str,
        profissional_id: str,
        data: str,
        hora_inicio: str,
        hora_fim: str,
        motivo: str | None,
    ):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                UPDATE bloqueios
                SET profissional_id = %s,
                    data = %s,
                    hora_inicio = %s,
                    hora_fim = %s,
                    motivo = %s
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, profissional_id, data, hora_inicio, hora_fim, motivo
                """,
                (
                    profissional_id,
                    data,
                    hora_inicio,
                    hora_fim,
                    motivo,
                    barbearia_id,
                    bloqueio_id,
                ),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("bloqueios")
                .update(
                    {
                        "profissional_id": profissional_id,
                        "data": data,
                        "hora_inicio": hora_inicio,
                        "hora_fim": hora_fim,
                        "motivo": motivo,
                    }
                )
                .eq("barbearia_id", barbearia_id)
                .eq("id", bloqueio_id)
                .execute()
            )
            data_response = response.data or []
            return data_response[0] if data_response else None

        return None

    @staticmethod
    def delete_bloqueio(barbearia_id: str, bloqueio_id: str):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                DELETE FROM bloqueios
                WHERE barbearia_id = %s AND id = %s
                RETURNING id
                """,
                (barbearia_id, bloqueio_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("bloqueios")
                .delete()
                .eq("barbearia_id", barbearia_id)
                .eq("id", bloqueio_id)
                .execute()
            )
            data_response = response.data or []
            return data_response[0] if data_response else None

        return None

    @staticmethod
    def cancel(barbearia_id: str, agendamento_id: str):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                UPDATE agendamentos
                SET status = 'CANCELLED'
                WHERE barbearia_id = %s AND id = %s
                RETURNING id
                """,
                (barbearia_id, agendamento_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .update({"status": "CANCELLED"})
                .eq("barbearia_id", barbearia_id)
                .eq("id", agendamento_id)
                .execute()
            )
            data_response = response.data or []
            return data_response[0] if data_response else None

        return None

    @staticmethod
    def transition_status(
        barbearia_id: str,
        agendamento_id: str,
        new_status: str,
        motivo: str | None = None,
        forma_pagamento: str | None = None,
        valor_final: float | None = None,
    ):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                UPDATE agendamentos
                SET status = %s,
                    forma_pagamento = CASE WHEN %s IS NULL THEN forma_pagamento ELSE %s END,
                    valor_final = CASE WHEN %s IS NULL THEN valor_final ELSE %s END,
                    pago_em = CASE WHEN %s = 'COMPLETED_FIN' THEN NOW() ELSE pago_em END,
                    concluido_operacional_em = CASE WHEN %s IN ('COMPLETED_OP', 'COMPLETED_FIN') THEN NOW() ELSE concluido_operacional_em END,
                    concluido_financeiro_em = CASE WHEN %s = 'COMPLETED_FIN' THEN NOW() ELSE concluido_financeiro_em END
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, cliente_id, profissional_id, servico_id,
                          data, hora_inicio, hora_fim, status,
                          valor_final, forma_pagamento, pago_em, desconto,
                          cortesia, estornado, concluido_operacional_em, concluido_financeiro_em
                """,
                (
                    new_status,
                    forma_pagamento,
                    forma_pagamento,
                    valor_final,
                    valor_final,
                    new_status,
                    new_status,
                    new_status,
                    barbearia_id,
                    agendamento_id,
                ),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            now_iso = datetime.now(tz=timezone.utc).isoformat()
            payload = {
                "status": new_status,
            }
            if forma_pagamento is not None:
                payload["forma_pagamento"] = forma_pagamento
            if valor_final is not None:
                payload["valor_final"] = valor_final
            if new_status == "COMPLETED_OP":
                payload["concluido_operacional_em"] = now_iso
            if new_status == "COMPLETED_FIN":
                payload["concluido_operacional_em"] = payload.get("concluido_operacional_em") or now_iso
                payload["concluido_financeiro_em"] = now_iso
                payload["pago_em"] = now_iso

            response = (
                supabase.table("agendamentos")
                .update(payload)
                .eq("barbearia_id", barbearia_id)
                .eq("id", agendamento_id)
                .execute()
            )
            data_response = response.data or []
            return data_response[0] if data_response else None

        return None

    @staticmethod
    def add_status_audit(
        barbearia_id: str,
        agendamento_id: str,
        status_anterior: str,
        status_novo: str,
        changed_by_user_id: str | None,
        changed_by_role: str | None,
        motivo: str | None = None,
        forma_pagamento: str | None = None,
        valor_final: float | None = None,
    ):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                INSERT INTO agendamento_status_auditoria (
                    barbearia_id,
                    agendamento_id,
                    status_anterior,
                    status_novo,
                    motivo,
                    forma_pagamento,
                    valor_final,
                    changed_by_user_id,
                    changed_by_role
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::uuid, %s)
                RETURNING id
                """,
                (
                    barbearia_id,
                    agendamento_id,
                    status_anterior,
                    status_novo,
                    motivo,
                    forma_pagamento,
                    valor_final,
                    changed_by_user_id,
                    changed_by_role,
                ),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamento_status_auditoria")
                .insert(
                    {
                        "barbearia_id": barbearia_id,
                        "agendamento_id": agendamento_id,
                        "status_anterior": status_anterior,
                        "status_novo": status_novo,
                        "motivo": motivo,
                        "forma_pagamento": forma_pagamento,
                        "valor_final": valor_final,
                        "changed_by_user_id": changed_by_user_id,
                        "changed_by_role": changed_by_role,
                    }
                )
                .execute()
            )
            data_response = response.data or []
            return data_response[0] if data_response else None

        return None

    @staticmethod
    def dashboard_metrics(barbearia_id: str):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT
                    COUNT(*)::int AS total_agendamentos,
                    COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelados,
                    COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmados
                FROM agendamentos
                WHERE barbearia_id = %s
                """,
                (barbearia_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .select("status")
                .eq("barbearia_id", barbearia_id)
                .execute()
            )
            rows = response.data or []
            total = len(rows)
            cancelados = sum(1 for row in rows if row.get("status") == "CANCELLED")
            confirmados = sum(1 for row in rows if row.get("status") == "CONFIRMED")
            return {
                "total_agendamentos": total,
                "cancelados": cancelados,
                "confirmados": confirmados,
            }

        return {
            "total_agendamentos": 0,
            "cancelados": 0,
            "confirmados": 0,
        }

    @staticmethod
    def dashboard_insights(barbearia_id: str):
        AgendamentosRepository.require_tenant(barbearia_id)

        base = {
            "top_clientes_frequentes": [],
            "top_clientes_faturamento": [],
            "clientes_risco_churn": [],
        }

        if is_db_ready():
            top_frequentes = query_all(
                """
                SELECT
                    c.id::text AS cliente_id,
                    c.nome AS cliente_nome,
                    COUNT(*)::int AS total_agendamentos,
                    MAX(a.data)::text AS ultima_visita
                FROM agendamentos a
                INNER JOIN clientes c
                  ON c.id = a.cliente_id AND c.barbearia_id = a.barbearia_id
                WHERE a.barbearia_id = %s
                  AND a.status <> 'BLOCKED'
                GROUP BY c.id, c.nome
                ORDER BY total_agendamentos DESC, ultima_visita DESC
                LIMIT 5
                """,
                (barbearia_id,),
            )

            top_faturamento = query_all(
                """
                SELECT
                    c.id::text AS cliente_id,
                    c.nome AS cliente_nome,
                    ROUND(COALESCE(SUM(COALESCE(a.valor_final, 0)), 0)::numeric, 2) AS total_faturado,
                    COUNT(*)::int AS total_agendamentos,
                    MAX(a.data)::text AS ultima_visita
                FROM agendamentos a
                INNER JOIN clientes c
                  ON c.id = a.cliente_id AND c.barbearia_id = a.barbearia_id
                WHERE a.barbearia_id = %s
                  AND a.status NOT IN ('BLOCKED', 'CANCELLED')
                GROUP BY c.id, c.nome
                ORDER BY total_faturado DESC, total_agendamentos DESC
                LIMIT 5
                """,
                (barbearia_id,),
            )

            risco_churn = query_all(
                """
                SELECT
                    c.id::text AS cliente_id,
                    c.nome AS cliente_nome,
                    MAX(a.data)::text AS ultima_visita,
                    (CURRENT_DATE - MAX(a.data))::int AS dias_sem_retorno
                FROM agendamentos a
                INNER JOIN clientes c
                  ON c.id = a.cliente_id AND c.barbearia_id = a.barbearia_id
                WHERE a.barbearia_id = %s
                  AND a.status NOT IN ('BLOCKED', 'CANCELLED')
                GROUP BY c.id, c.nome
                HAVING (CURRENT_DATE - MAX(a.data)) >= 45
                ORDER BY dias_sem_retorno DESC, ultima_visita ASC
                LIMIT 5
                """,
                (barbearia_id,),
            )

            base["top_clientes_frequentes"] = top_frequentes
            base["top_clientes_faturamento"] = top_faturamento
            base["clientes_risco_churn"] = risco_churn
            return base

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .select("cliente_id,data,status,valor_final")
                .eq("barbearia_id", barbearia_id)
                .execute()
            )
            rows = response.data or []

            clientes_response = (
                supabase.table("clientes")
                .select("id,nome")
                .eq("barbearia_id", barbearia_id)
                .execute()
            )
            clientes_rows = clientes_response.data or []
            clientes_nome = {str(item.get("id")): item.get("nome") for item in clientes_rows}

            frequencia: dict[str, dict] = {}
            faturamento: dict[str, dict] = {}
            churn: dict[str, dict] = {}
            today = datetime.utcnow().date()

            for item in rows:
                cliente_id = str(item.get("cliente_id") or "")
                if not cliente_id:
                    continue

                data_str = str(item.get("data") or "")[:10]
                try:
                    data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
                except ValueError:
                    continue

                status = str(item.get("status") or "").upper()

                freq_entry = frequencia.setdefault(
                    cliente_id,
                    {
                        "cliente_id": cliente_id,
                        "cliente_nome": clientes_nome.get(cliente_id) or "Cliente",
                        "total_agendamentos": 0,
                        "ultima_visita": data_str,
                    },
                )
                if status != "BLOCKED":
                    freq_entry["total_agendamentos"] += 1
                if data_str > str(freq_entry.get("ultima_visita") or ""):
                    freq_entry["ultima_visita"] = data_str

                if status not in {"BLOCKED", "CANCELLED"}:
                    fat_entry = faturamento.setdefault(
                        cliente_id,
                        {
                            "cliente_id": cliente_id,
                            "cliente_nome": clientes_nome.get(cliente_id) or "Cliente",
                            "total_faturado": 0.0,
                            "total_agendamentos": 0,
                            "ultima_visita": data_str,
                        },
                    )
                    fat_entry["total_faturado"] += float(item.get("valor_final") or 0)
                    fat_entry["total_agendamentos"] += 1
                    if data_str > str(fat_entry.get("ultima_visita") or ""):
                        fat_entry["ultima_visita"] = data_str

                    churn_entry = churn.setdefault(
                        cliente_id,
                        {
                            "cliente_id": cliente_id,
                            "cliente_nome": clientes_nome.get(cliente_id) or "Cliente",
                            "ultima_visita": data_str,
                            "dias_sem_retorno": 0,
                        },
                    )
                    if data_str > str(churn_entry.get("ultima_visita") or ""):
                        churn_entry["ultima_visita"] = data_str

            top_frequentes = sorted(
                [item for item in frequencia.values() if int(item.get("total_agendamentos") or 0) > 0],
                key=lambda item: (int(item.get("total_agendamentos") or 0), str(item.get("ultima_visita") or "")),
                reverse=True,
            )[:5]

            top_faturamento = sorted(
                [item for item in faturamento.values() if int(item.get("total_agendamentos") or 0) > 0],
                key=lambda item: (float(item.get("total_faturado") or 0), int(item.get("total_agendamentos") or 0)),
                reverse=True,
            )[:5]

            risco_churn = []
            for item in churn.values():
                data_str = str(item.get("ultima_visita") or "")
                try:
                    ultima = datetime.strptime(data_str, "%Y-%m-%d").date()
                except ValueError:
                    continue
                dias_sem_retorno = (today - ultima).days
                if dias_sem_retorno >= 45:
                    item["dias_sem_retorno"] = dias_sem_retorno
                    risco_churn.append(item)

            risco_churn = sorted(
                risco_churn,
                key=lambda item: int(item.get("dias_sem_retorno") or 0),
                reverse=True,
            )[:5]

            for item in top_faturamento:
                item["total_faturado"] = round(float(item.get("total_faturado") or 0), 2)

            base["top_clientes_frequentes"] = top_frequentes
            base["top_clientes_faturamento"] = top_faturamento
            base["clientes_risco_churn"] = risco_churn
            return base

        return base
