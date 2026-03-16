from backend.db import is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class AgendamentosRepository(BaseRepository):
    @staticmethod
    def list_by_date(barbearia_id: str, profissional_id: str, data: str):
        AgendamentosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT id, barbearia_id, cliente_id, profissional_id, servico_id,
                       data, hora_inicio, hora_fim, status
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
                .select("id,barbearia_id,cliente_id,profissional_id,servico_id,data,hora_inicio,hora_fim,status")
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
                          data, hora_inicio, hora_fim, status
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
                          data, hora_inicio, hora_fim, status
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
                .select("id,barbearia_id,cliente_id,profissional_id,servico_id,data,hora_inicio,hora_fim,status")
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
