from backend.db import get_conn, is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class ServicosRepository(BaseRepository):
    @staticmethod
    def _validate_order_payload(barbearia_id: str, service_ids: list[str]) -> dict:
        normalized = [str(item or "").strip() for item in service_ids if str(item or "").strip()]
        if len(normalized) == 0:
            return {"error": "service_ids deve conter ao menos um item"}

        unique_ids = list(dict.fromkeys(normalized))
        if len(unique_ids) != len(normalized):
            return {"error": "service_ids não pode conter ids repetidos"}

        if is_db_ready():
            existing = query_all(
                """
                SELECT id
                FROM servicos
                WHERE barbearia_id = %s
                """,
                (barbearia_id,),
            )
            existing_ids = {str(item.get("id")) for item in (existing or [])}
            provided_ids = set(unique_ids)
            if existing_ids != provided_ids:
                return {"error": "service_ids deve conter exatamente todos os serviços da barbearia"}
            return {"ids": unique_ids}

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("servicos")
                .select("id")
                .eq("barbearia_id", barbearia_id)
                .execute()
            )
            existing_ids = {str(item.get("id")) for item in (response.data or [])}
            provided_ids = set(unique_ids)
            if existing_ids != provided_ids:
                return {"error": "service_ids deve conter exatamente todos os serviços da barbearia"}
            return {"ids": unique_ids}

        return {"error": "base de dados indisponível"}

    @staticmethod
    def has_linked_appointments(barbearia_id: str, servico_id: str) -> bool:
        ServicosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            row = query_one(
                """
                SELECT 1 AS linked
                FROM agendamentos
                WHERE barbearia_id = %s AND servico_id = %s
                LIMIT 1
                """,
                (barbearia_id, servico_id),
            )
            return bool(row)

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .select("id")
                .eq("barbearia_id", barbearia_id)
                .eq("servico_id", servico_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return len(data) > 0

        return False

    @staticmethod
    def list_all(barbearia_id: str):
        ServicosRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT id, barbearia_id, categoria_id, nome, duracao_min, preco, sort_order
                FROM servicos
                WHERE barbearia_id = %s
                ORDER BY sort_order ASC, nome ASC
                """,
                (barbearia_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("servicos")
                .select("id,barbearia_id,categoria_id,nome,duracao_min,preco,sort_order")
                .eq("barbearia_id", barbearia_id)
                .order("sort_order")
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
                INSERT INTO servicos (barbearia_id, categoria_id, nome, duracao_min, preco, sort_order)
                VALUES (
                  %s,
                  %s,
                  %s,
                  %s,
                  %s,
                  COALESCE((SELECT MAX(sort_order) FROM servicos WHERE barbearia_id = %s), 0) + 1
                )
                RETURNING id, barbearia_id, categoria_id, nome, duracao_min, preco, sort_order
                """,
                (barbearia_id, categoria_id, nome, duracao_min, preco, barbearia_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            max_response = (
                supabase.table("servicos")
                .select("sort_order")
                .eq("barbearia_id", barbearia_id)
                .order("sort_order", desc=True)
                .limit(1)
                .execute()
            )
            max_sort_order = 0
            if max_response.data:
                max_sort_order = int((max_response.data[0] or {}).get("sort_order") or 0)
            response = (
                supabase.table("servicos")
                .insert(
                    {
                        "barbearia_id": barbearia_id,
                        "categoria_id": categoria_id,
                        "nome": nome,
                        "duracao_min": duracao_min,
                        "preco": preco,
                        "sort_order": max_sort_order + 1,
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
                RETURNING id, barbearia_id, categoria_id, nome, duracao_min, preco, sort_order
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
    def reorder(barbearia_id: str, service_ids: list[str]):
        ServicosRepository.require_tenant(barbearia_id)
        validation = ServicosRepository._validate_order_payload(barbearia_id, service_ids)
        if validation.get("error"):
            return {"error": validation["error"]}

        ordered_ids = validation["ids"]

        if is_db_ready():
            with get_conn() as conn:
                with conn.cursor() as cur:
                    for index, service_id in enumerate(ordered_ids, start=1):
                        cur.execute(
                            """
                            UPDATE servicos
                            SET sort_order = %s
                            WHERE barbearia_id = %s AND id = %s
                            """,
                            (index, barbearia_id, service_id),
                        )
                conn.commit()
            return {"data": ServicosRepository.list_all(barbearia_id)}

        if is_supabase_ready():
            supabase = get_supabase_client()
            for index, service_id in enumerate(ordered_ids, start=1):
                (
                    supabase.table("servicos")
                    .update({"sort_order": index})
                    .eq("barbearia_id", barbearia_id)
                    .eq("id", service_id)
                    .execute()
                )
            return {"data": ServicosRepository.list_all(barbearia_id)}

        return {"error": "base de dados indisponível"}

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
