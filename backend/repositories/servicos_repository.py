from backend.db import is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class ServicosRepository(BaseRepository):
    @staticmethod
    def list_all(barbearia_id: str):
        ServicosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT id, barbearia_id, categoria_id, nome, duracao_min, preco
                FROM servicos
                WHERE barbearia_id = %s
                ORDER BY nome
                """,
                (barbearia_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("servicos")
                .select("id,barbearia_id,categoria_id,nome,duracao_min,preco")
                .eq("barbearia_id", barbearia_id)
                .order("nome")
                .execute()
            )
            return response.data or []

        return []

    @staticmethod
    def create(
        barbearia_id: str,
        categoria_id: str | None,
        nome: str,
        duracao_min: int,
        preco: float,
    ):
        ServicosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                INSERT INTO servicos (barbearia_id, categoria_id, nome, duracao_min, preco)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, barbearia_id, categoria_id, nome, duracao_min, preco
                """,
                (barbearia_id, categoria_id, nome, duracao_min, preco),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("servicos")
                .insert(
                    {
                        "barbearia_id": barbearia_id,
                        "categoria_id": categoria_id,
                        "nome": nome,
                        "duracao_min": duracao_min,
                        "preco": preco,
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
        servico_id: str,
        categoria_id: str | None,
        nome: str,
        duracao_min: int,
        preco: float,
    ):
        ServicosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                UPDATE servicos
                SET categoria_id = %s, nome = %s, duracao_min = %s, preco = %s
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, categoria_id, nome, duracao_min, preco
                """,
                (categoria_id, nome, duracao_min, preco, barbearia_id, servico_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("servicos")
                .update(
                    {
                        "categoria_id": categoria_id,
                        "nome": nome,
                        "duracao_min": duracao_min,
                        "preco": preco,
                    }
                )
                .eq("barbearia_id", barbearia_id)
                .eq("id", servico_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def delete(barbearia_id: str, servico_id: str):
        ServicosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                DELETE FROM servicos
                WHERE barbearia_id = %s AND id = %s
                RETURNING id
                """,
                (barbearia_id, servico_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("servicos")
                .delete()
                .eq("barbearia_id", barbearia_id)
                .eq("id", servico_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None
