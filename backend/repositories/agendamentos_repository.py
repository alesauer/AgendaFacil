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
                SELECT id, barbearia_id, cliente_id, profissional_id, servico_id,
                       data, hora_inicio, hora_fim, status
                FROM agendamentos
                WHERE barbearia_id = %s
                ORDER BY data DESC, hora_inicio DESC
                """,
                (barbearia_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .select("id,barbearia_id,cliente_id,profissional_id,servico_id,data,hora_inicio,hora_fim,status")
                .eq("barbearia_id", barbearia_id)
                .order("data", desc=True)
                .order("hora_inicio", desc=True)
                .execute()
            )
            return response.data or []

        return []

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
