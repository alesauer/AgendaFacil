from backend.db import is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class ClientesRepository(BaseRepository):
    @staticmethod
    def has_linked_appointments(barbearia_id: str, cliente_id: str) -> bool:
        ClientesRepository.require_tenant(barbearia_id)
        if is_db_ready():
            row = query_one(
                """
                SELECT 1 AS linked
                FROM agendamentos
                WHERE barbearia_id = %s AND cliente_id = %s
                LIMIT 1
                """,
                (barbearia_id, cliente_id),
            )
            return bool(row)

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .select("id")
                .eq("barbearia_id", barbearia_id)
                .eq("cliente_id", cliente_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return len(data) > 0

        return False

    @staticmethod
    def list_all(barbearia_id: str):
        ClientesRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT id, barbearia_id, nome, telefone, data_nascimento
                FROM clientes
                WHERE barbearia_id = %s
                ORDER BY nome
                """,
                (barbearia_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("clientes")
                .select("id,barbearia_id,nome,telefone,data_nascimento")
                .eq("barbearia_id", barbearia_id)
                .order("nome")
                .execute()
            )
            return response.data or []

        return []

    @staticmethod
    def create(barbearia_id: str, nome: str, telefone: str, data_nascimento: str | None):
        ClientesRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                INSERT INTO clientes (barbearia_id, nome, telefone, data_nascimento)
                VALUES (%s, %s, %s, %s)
                RETURNING id, barbearia_id, nome, telefone, data_nascimento
                """,
                (barbearia_id, nome, telefone, data_nascimento),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("clientes")
                .insert(
                    {
                        "barbearia_id": barbearia_id,
                        "nome": nome,
                        "telefone": telefone,
                        "data_nascimento": data_nascimento,
                    }
                )
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def update(barbearia_id: str, cliente_id: str, nome: str, telefone: str, data_nascimento: str | None):
        ClientesRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                UPDATE clientes
                SET nome = %s, telefone = %s, data_nascimento = %s
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, nome, telefone, data_nascimento
                """,
                (nome, telefone, data_nascimento, barbearia_id, cliente_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("clientes")
                .update(
                    {
                        "nome": nome,
                        "telefone": telefone,
                        "data_nascimento": data_nascimento,
                    }
                )
                .eq("barbearia_id", barbearia_id)
                .eq("id", cliente_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def delete(barbearia_id: str, cliente_id: str):
        ClientesRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                DELETE FROM clientes
                WHERE barbearia_id = %s AND id = %s
                RETURNING id
                """,
                (barbearia_id, cliente_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("clientes")
                .delete()
                .eq("barbearia_id", barbearia_id)
                .eq("id", cliente_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None
