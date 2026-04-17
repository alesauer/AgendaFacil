from backend.db import execute, is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class ClientesRepository(BaseRepository):
    @staticmethod
    def _is_missing_email_column_error(exc: Exception) -> bool:
        message = str(exc).lower()
        if "email" not in message:
            return False
        return (
            "column" in message
            or "schema cache" in message
            or "does not exist" in message
            or "could not find" in message
        )

    @staticmethod
    def _is_missing_metrics_column_error(exc: Exception) -> bool:
        message = str(exc).lower()
        if "cortes_count" not in message and "total_gasto" not in message and "ultima_visita" not in message:
            return False
        return (
            "column" in message
            or "schema cache" in message
            or "does not exist" in message
            or "could not find" in message
        )

    @staticmethod
    def find_by_phone(barbearia_id: str, telefone: str):
        ClientesRepository.require_tenant(barbearia_id)
        if is_db_ready():
            try:
                return query_one(
                    """
                    SELECT id, barbearia_id, nome, telefone, email, data_nascimento,
                           cortes_count, total_gasto, ultima_visita
                    FROM clientes
                    WHERE barbearia_id = %s AND telefone = %s
                    LIMIT 1
                    """,
                    (barbearia_id, telefone),
                )
            except Exception as exc:
                if ClientesRepository._is_missing_metrics_column_error(exc):
                    try:
                        return query_one(
                            """
                            SELECT id, barbearia_id, nome, telefone, email, data_nascimento
                            FROM clientes
                            WHERE barbearia_id = %s AND telefone = %s
                            LIMIT 1
                            """,
                            (barbearia_id, telefone),
                        )
                    except Exception as nested_exc:
                        if not ClientesRepository._is_missing_email_column_error(nested_exc):
                            raise
                        return query_one(
                            """
                            SELECT id, barbearia_id, nome, telefone, data_nascimento
                            FROM clientes
                            WHERE barbearia_id = %s AND telefone = %s
                            LIMIT 1
                            """,
                            (barbearia_id, telefone),
                        )
                if not ClientesRepository._is_missing_email_column_error(exc):
                    raise
                return query_one(
                    """
                    SELECT id, barbearia_id, nome, telefone, data_nascimento
                    FROM clientes
                    WHERE barbearia_id = %s AND telefone = %s
                    LIMIT 1
                    """,
                    (barbearia_id, telefone),
                )

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = (
                    supabase.table("clientes")
                    .select("id,barbearia_id,nome,telefone,email,data_nascimento,cortes_count,total_gasto,ultima_visita")
                    .eq("barbearia_id", barbearia_id)
                    .eq("telefone", telefone)
                    .limit(1)
                    .execute()
                )
            except Exception as exc:
                if ClientesRepository._is_missing_metrics_column_error(exc):
                    try:
                        response = (
                            supabase.table("clientes")
                            .select("id,barbearia_id,nome,telefone,email,data_nascimento")
                            .eq("barbearia_id", barbearia_id)
                            .eq("telefone", telefone)
                            .limit(1)
                            .execute()
                        )
                    except Exception as nested_exc:
                        if not ClientesRepository._is_missing_email_column_error(nested_exc):
                            raise
                        response = (
                            supabase.table("clientes")
                            .select("id,barbearia_id,nome,telefone,data_nascimento")
                            .eq("barbearia_id", barbearia_id)
                            .eq("telefone", telefone)
                            .limit(1)
                            .execute()
                        )
                    data = response.data or []
                    return data[0] if data else None
                if not ClientesRepository._is_missing_email_column_error(exc):
                    raise
                response = (
                    supabase.table("clientes")
                    .select("id,barbearia_id,nome,telefone,data_nascimento")
                    .eq("barbearia_id", barbearia_id)
                    .eq("telefone", telefone)
                    .limit(1)
                    .execute()
                )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def has_linked_appointments(barbearia_id: str, cliente_id: str) -> bool:
        ClientesRepository.require_tenant(barbearia_id)
        if is_db_ready():
            row = query_one(
                """
                SELECT 1 AS linked
                FROM agendamentos
                WHERE barbearia_id = %s AND cliente_id = %s
                  AND status <> 'CANCELLED'
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
                .neq("status", "CANCELLED")
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
            try:
                return query_all(
                    """
                    SELECT id, barbearia_id, nome, telefone, email, data_nascimento,
                           cortes_count, total_gasto, ultima_visita
                    FROM clientes
                    WHERE barbearia_id = %s
                    ORDER BY nome
                    """,
                    (barbearia_id,),
                )
            except Exception as exc:
                if ClientesRepository._is_missing_metrics_column_error(exc):
                    try:
                        return query_all(
                            """
                            SELECT id, barbearia_id, nome, telefone, email, data_nascimento
                            FROM clientes
                            WHERE barbearia_id = %s
                            ORDER BY nome
                            """,
                            (barbearia_id,),
                        )
                    except Exception as nested_exc:
                        if not ClientesRepository._is_missing_email_column_error(nested_exc):
                            raise
                        return query_all(
                            """
                            SELECT id, barbearia_id, nome, telefone, data_nascimento
                            FROM clientes
                            WHERE barbearia_id = %s
                            ORDER BY nome
                            """,
                            (barbearia_id,),
                        )
                if not ClientesRepository._is_missing_email_column_error(exc):
                    raise
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
            try:
                response = (
                    supabase.table("clientes")
                    .select("id,barbearia_id,nome,telefone,email,data_nascimento,cortes_count,total_gasto,ultima_visita")
                    .eq("barbearia_id", barbearia_id)
                    .order("nome")
                    .execute()
                )
            except Exception as exc:
                if ClientesRepository._is_missing_metrics_column_error(exc):
                    try:
                        response = (
                            supabase.table("clientes")
                            .select("id,barbearia_id,nome,telefone,email,data_nascimento")
                            .eq("barbearia_id", barbearia_id)
                            .order("nome")
                            .execute()
                        )
                    except Exception as nested_exc:
                        if not ClientesRepository._is_missing_email_column_error(nested_exc):
                            raise
                        response = (
                            supabase.table("clientes")
                            .select("id,barbearia_id,nome,telefone,data_nascimento")
                            .eq("barbearia_id", barbearia_id)
                            .order("nome")
                            .execute()
                        )
                    return response.data or []
                if not ClientesRepository._is_missing_email_column_error(exc):
                    raise
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
    def create(
        barbearia_id: str,
        nome: str,
        telefone: str,
        data_nascimento: str | None,
        email: str | None = None,
    ):
        ClientesRepository.require_tenant(barbearia_id)
        if is_db_ready():
            try:
                return query_one(
                    """
                    INSERT INTO clientes (barbearia_id, nome, telefone, email, data_nascimento)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, barbearia_id, nome, telefone, email, data_nascimento,
                              cortes_count, total_gasto, ultima_visita
                    """,
                    (barbearia_id, nome, telefone, email, data_nascimento),
                )
            except Exception as exc:
                if ClientesRepository._is_missing_metrics_column_error(exc):
                    try:
                        return query_one(
                            """
                            INSERT INTO clientes (barbearia_id, nome, telefone, email, data_nascimento)
                            VALUES (%s, %s, %s, %s, %s)
                            RETURNING id, barbearia_id, nome, telefone, email, data_nascimento
                            """,
                            (barbearia_id, nome, telefone, email, data_nascimento),
                        )
                    except Exception as nested_exc:
                        if not ClientesRepository._is_missing_email_column_error(nested_exc):
                            raise
                        return query_one(
                            """
                            INSERT INTO clientes (barbearia_id, nome, telefone, data_nascimento)
                            VALUES (%s, %s, %s, %s)
                            RETURNING id, barbearia_id, nome, telefone, data_nascimento
                            """,
                            (barbearia_id, nome, telefone, data_nascimento),
                        )
                if not ClientesRepository._is_missing_email_column_error(exc):
                    raise
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
            insert_payload = {
                "barbearia_id": barbearia_id,
                "nome": nome,
                "telefone": telefone,
                "data_nascimento": data_nascimento,
            }
            if email is not None:
                insert_payload["email"] = email

            try:
                response = supabase.table("clientes").insert(insert_payload).execute()
            except Exception as exc:
                if not ClientesRepository._is_missing_email_column_error(exc):
                    raise
                insert_payload.pop("email", None)
                response = supabase.table("clientes").insert(insert_payload).execute()

            data = response.data or []
            if data:
                created = data[0]
                if isinstance(created, dict) and created.get("id"):
                    hydrated = ClientesRepository.find_by_phone(barbearia_id, telefone)
                    return hydrated or created
                return created

            return ClientesRepository.find_by_phone(barbearia_id, telefone)

        return None

    @staticmethod
    def update(
        barbearia_id: str,
        cliente_id: str,
        nome: str,
        telefone: str,
        data_nascimento: str | None,
        email: str | None = None,
    ):
        ClientesRepository.require_tenant(barbearia_id)
        if is_db_ready():
            try:
                return query_one(
                    """
                    UPDATE clientes
                    SET nome = %s, telefone = %s, email = %s, data_nascimento = %s
                    WHERE barbearia_id = %s AND id = %s
                    RETURNING id, barbearia_id, nome, telefone, email, data_nascimento,
                              cortes_count, total_gasto, ultima_visita
                    """,
                    (nome, telefone, email, data_nascimento, barbearia_id, cliente_id),
                )
            except Exception as exc:
                if ClientesRepository._is_missing_metrics_column_error(exc):
                    try:
                        return query_one(
                            """
                            UPDATE clientes
                            SET nome = %s, telefone = %s, email = %s, data_nascimento = %s
                            WHERE barbearia_id = %s AND id = %s
                            RETURNING id, barbearia_id, nome, telefone, email, data_nascimento
                            """,
                            (nome, telefone, email, data_nascimento, barbearia_id, cliente_id),
                        )
                    except Exception as nested_exc:
                        if not ClientesRepository._is_missing_email_column_error(nested_exc):
                            raise
                        return query_one(
                            """
                            UPDATE clientes
                            SET nome = %s, telefone = %s, data_nascimento = %s
                            WHERE barbearia_id = %s AND id = %s
                            RETURNING id, barbearia_id, nome, telefone, data_nascimento
                            """,
                            (nome, telefone, data_nascimento, barbearia_id, cliente_id),
                        )
                if not ClientesRepository._is_missing_email_column_error(exc):
                    raise
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
            update_payload = {
                "nome": nome,
                "telefone": telefone,
                "data_nascimento": data_nascimento,
            }
            if email is not None:
                update_payload["email"] = email

            try:
                response = (
                    supabase.table("clientes")
                    .update(update_payload)
                    .eq("barbearia_id", barbearia_id)
                    .eq("id", cliente_id)
                    .execute()
                )
            except Exception as exc:
                if not ClientesRepository._is_missing_email_column_error(exc):
                    raise
                update_payload.pop("email", None)
                response = (
                    supabase.table("clientes")
                    .update(update_payload)
                    .eq("barbearia_id", barbearia_id)
                    .eq("id", cliente_id)
                    .execute()
                )

            data = response.data or []
            if data:
                updated = data[0]
                if isinstance(updated, dict) and updated.get("id"):
                    return ClientesRepository.find_by_phone(barbearia_id, telefone) or updated
                return updated

            return ClientesRepository.find_by_phone(barbearia_id, telefone)

        return None

    @staticmethod
    def delete(barbearia_id: str, cliente_id: str):
        ClientesRepository.require_tenant(barbearia_id)
        if is_db_ready():
            execute(
                """
                DELETE FROM agendamentos
                WHERE barbearia_id = %s
                  AND cliente_id = %s
                  AND status = 'CANCELLED'
                """,
                (barbearia_id, cliente_id),
            )
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
            (
                supabase.table("agendamentos")
                .delete()
                .eq("barbearia_id", barbearia_id)
                .eq("cliente_id", cliente_id)
                .eq("status", "CANCELLED")
                .execute()
            )
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

    @staticmethod
    def recalculate_metrics(barbearia_id: str, cliente_id: str):
        ClientesRepository.require_tenant(barbearia_id)
        if not cliente_id:
            return None

        allowed_status = ("COMPLETED_OP", "COMPLETED_FIN", "COMPLETED")

        if is_db_ready():
            stats = query_one(
                """
                SELECT
                  COUNT(*)::int AS cortes_count,
                  COALESCE(SUM(COALESCE(valor_final, 0)), 0)::numeric(10,2) AS total_gasto,
                  MAX(data) AS ultima_visita
                FROM agendamentos
                WHERE barbearia_id = %s
                  AND cliente_id = %s
                                    AND status IN ('COMPLETED_OP', 'COMPLETED_FIN', 'COMPLETED')
                """,
                                (barbearia_id, cliente_id),
            ) or {}

            return query_one(
                """
                UPDATE clientes
                SET cortes_count = %s,
                    total_gasto = %s,
                    ultima_visita = %s
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, nome, telefone, email, data_nascimento,
                          cortes_count, total_gasto, ultima_visita
                """,
                (
                    int(stats.get("cortes_count") or 0),
                    float(stats.get("total_gasto") or 0),
                    stats.get("ultima_visita"),
                    barbearia_id,
                    cliente_id,
                ),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("agendamentos")
                .select("data,valor_final,status")
                .eq("barbearia_id", barbearia_id)
                .eq("cliente_id", cliente_id)
                .in_("status", list(allowed_status))
                .execute()
            )
            rows = response.data or []

            cortes_count = len(rows)
            total_gasto = 0.0
            ultima_visita = None
            for row in rows:
                total_gasto += float(row.get("valor_final") or 0)
                data = row.get("data")
                if data is not None:
                    data_str = str(data)
                    if ultima_visita is None or data_str > ultima_visita:
                        ultima_visita = data_str

            updated = (
                supabase.table("clientes")
                .update(
                    {
                        "cortes_count": cortes_count,
                        "total_gasto": round(total_gasto, 2),
                        "ultima_visita": ultima_visita,
                    }
                )
                .eq("barbearia_id", barbearia_id)
                .eq("id", cliente_id)
                .select("id,barbearia_id,nome,telefone,email,data_nascimento,cortes_count,total_gasto,ultima_visita")
                .execute()
            )
            data = updated.data or []
            return data[0] if data else None

        return None
