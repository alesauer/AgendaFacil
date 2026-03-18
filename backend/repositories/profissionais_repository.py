from backend.db import is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class ProfissionaisRepository(BaseRepository):
    @staticmethod
    def has_linked_appointments(barbearia_id: str, profissional_id: str) -> bool:
        ProfissionaisRepository.require_tenant(barbearia_id)
        if is_db_ready():
            row = query_one(
                """
                SELECT 1 AS linked
                FROM agendamentos
                WHERE barbearia_id = %s AND profissional_id = %s
                LIMIT 1
                """,
                (barbearia_id, profissional_id),
            )
            return bool(row)

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .select("id")
                .eq("barbearia_id", barbearia_id)
                .eq("profissional_id", profissional_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return len(data) > 0

        return False

    @staticmethod
    def list_all(barbearia_id: str):
        ProfissionaisRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT id, barbearia_id, nome, cargo, telefone, foto_url, comissao_percentual, ativo
                FROM profissionais
                WHERE barbearia_id = %s
                ORDER BY nome
                """,
                (barbearia_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("profissionais")
                .select("id,barbearia_id,nome,cargo,telefone,foto_url,comissao_percentual,ativo")
                .eq("barbearia_id", barbearia_id)
                .order("nome")
                .execute()
            )
            return response.data or []

        return []

    @staticmethod
    def create(
        barbearia_id: str,
        nome: str,
        cargo: str,
        telefone: str,
        foto_url: str | None,
        comissao_percentual: float,
        profissional_id: str | None = None,
    ):
        ProfissionaisRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                INSERT INTO profissionais (id, barbearia_id, nome, cargo, telefone, foto_url, comissao_percentual, ativo)
                VALUES (COALESCE(%s::uuid, gen_random_uuid()), %s, %s, %s, %s, %s, %s, true)
                RETURNING id, barbearia_id, nome, cargo, telefone, foto_url, comissao_percentual, ativo
                """,
                (
                    profissional_id,
                    barbearia_id,
                    nome,
                    cargo,
                    telefone,
                    foto_url,
                    comissao_percentual,
                ),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("profissionais")
                .insert(
                    {
                        "id": profissional_id,
                        "barbearia_id": barbearia_id,
                        "nome": nome,
                        "cargo": cargo,
                        "telefone": telefone,
                        "foto_url": foto_url,
                        "comissao_percentual": comissao_percentual,
                        "ativo": True,
                    }
                )
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def update(
        barbearia_id: str,
        profissional_id: str,
        nome: str,
        cargo: str,
        telefone: str,
        foto_url: str | None,
        comissao_percentual: float,
        ativo: bool,
    ):
        ProfissionaisRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                UPDATE profissionais
                SET nome = %s, cargo = %s, telefone = %s, foto_url = %s, comissao_percentual = %s, ativo = %s
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, nome, cargo, telefone, foto_url, comissao_percentual, ativo
                """,
                (
                    nome,
                    cargo,
                    telefone,
                    foto_url,
                    comissao_percentual,
                    ativo,
                    barbearia_id,
                    profissional_id,
                ),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("profissionais")
                .update(
                    {
                        "nome": nome,
                        "cargo": cargo,
                        "telefone": telefone,
                        "foto_url": foto_url,
                        "comissao_percentual": comissao_percentual,
                        "ativo": ativo,
                    }
                )
                .eq("barbearia_id", barbearia_id)
                .eq("id", profissional_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def delete(barbearia_id: str, profissional_id: str):
        ProfissionaisRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                DELETE FROM profissionais
                WHERE barbearia_id = %s AND id = %s
                RETURNING id
                """,
                (barbearia_id, profissional_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("profissionais")
                .delete()
                .eq("barbearia_id", barbearia_id)
                .eq("id", profissional_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None
