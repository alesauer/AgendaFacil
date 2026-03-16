from backend.db import is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class CategoriasRepository(BaseRepository):
    @staticmethod
    def has_linked_services(barbearia_id: str, categoria_id: str) -> bool:
        CategoriasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            row = query_one(
                """
                SELECT 1 AS linked
                FROM servicos
                WHERE barbearia_id = %s AND categoria_id = %s
                LIMIT 1
                """,
                (barbearia_id, categoria_id),
            )
            return bool(row)

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("servicos")
                .select("id")
                .eq("barbearia_id", barbearia_id)
                .eq("categoria_id", categoria_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return len(data) > 0

        return False

    @staticmethod
    def list_all(barbearia_id: str):
        CategoriasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT id, barbearia_id, nome, descricao
                FROM categorias
                WHERE barbearia_id = %s
                ORDER BY nome
                """,
                (barbearia_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("categorias")
                .select("id,barbearia_id,nome,descricao")
                .eq("barbearia_id", barbearia_id)
                .order("nome")
                .execute()
            )
            return response.data or []

        return []

    @staticmethod
    def create(barbearia_id: str, nome: str, descricao: str | None):
        CategoriasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                INSERT INTO categorias (barbearia_id, nome, descricao)
                VALUES (%s, %s, %s)
                RETURNING id, barbearia_id, nome, descricao
                """,
                (barbearia_id, nome, descricao),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("categorias")
                .insert(
                    {
                        "barbearia_id": barbearia_id,
                        "nome": nome,
                        "descricao": descricao,
                    }
                )
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def update(barbearia_id: str, categoria_id: str, nome: str, descricao: str | None):
        CategoriasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                UPDATE categorias
                SET nome = %s, descricao = %s
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, nome, descricao
                """,
                (nome, descricao, barbearia_id, categoria_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("categorias")
                .update({"nome": nome, "descricao": descricao})
                .eq("barbearia_id", barbearia_id)
                .eq("id", categoria_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def delete(barbearia_id: str, categoria_id: str):
        CategoriasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                DELETE FROM categorias
                WHERE barbearia_id = %s AND id = %s
                RETURNING id
                """,
                (barbearia_id, categoria_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("categorias")
                .delete()
                .eq("barbearia_id", barbearia_id)
                .eq("id", categoria_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None
