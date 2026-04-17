from backend.db import is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class ProfissionaisRepository(BaseRepository):
    @staticmethod
    def _normalize_optional_text(value: str | None):
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @staticmethod
    def _is_missing_profissionais_column_error(exc: Exception) -> bool:
        message = str(exc).lower()
        references_profissionais_column = any(
            token in message
            for token in (
                "comissao_percentual",
                "ativo",
                "foto_url",
                "telefone",
                "cargo",
            )
        )
        if not references_profissionais_column:
            return False
        return (
            "column" in message
            or "schema cache" in message
            or "does not exist" in message
            or "could not find" in message
        )

    @staticmethod
    def _normalize_profissional_row(item: dict):
        row = dict(item or {})
        row.setdefault("cargo", "")
        row.setdefault("telefone", "")
        row.setdefault("foto_url", None)
        row.setdefault("comissao_percentual", 0)
        row.setdefault("ativo", True)
        return row

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
            candidates = [
                "SELECT id, barbearia_id, nome, cargo, telefone, foto_url, comissao_percentual, ativo FROM profissionais WHERE barbearia_id = %s ORDER BY nome",
                "SELECT id, barbearia_id, nome, cargo, telefone, foto_url, ativo FROM profissionais WHERE barbearia_id = %s ORDER BY nome",
                "SELECT id, barbearia_id, nome, cargo, telefone, ativo FROM profissionais WHERE barbearia_id = %s ORDER BY nome",
                "SELECT id, barbearia_id, nome, cargo, telefone FROM profissionais WHERE barbearia_id = %s ORDER BY nome",
                "SELECT id, barbearia_id, nome, cargo FROM profissionais WHERE barbearia_id = %s ORDER BY nome",
                "SELECT id, barbearia_id, nome FROM profissionais WHERE barbearia_id = %s ORDER BY nome",
            ]
            last_exc = None
            for sql in candidates:
                try:
                    rows = query_all(sql, (barbearia_id,))
                    return [ProfissionaisRepository._normalize_profissional_row(item) for item in rows]
                except Exception as exc:
                    last_exc = exc
                    if not ProfissionaisRepository._is_missing_profissionais_column_error(exc):
                        raise
            if last_exc:
                raise last_exc
            return []

        if is_supabase_ready():
            supabase = get_supabase_client()
            select_candidates = [
                "id,barbearia_id,nome,cargo,telefone,foto_url,comissao_percentual,ativo",
                "id,barbearia_id,nome,cargo,telefone,foto_url,ativo",
                "id,barbearia_id,nome,cargo,telefone,ativo",
                "id,barbearia_id,nome,cargo,telefone",
                "id,barbearia_id,nome,cargo",
                "id,barbearia_id,nome",
            ]
            last_exc = None
            for select_fields in select_candidates:
                try:
                    response = (
                        supabase.table("profissionais")
                        .select(select_fields)
                        .eq("barbearia_id", barbearia_id)
                        .order("nome")
                        .execute()
                    )
                    data = response.data or []
                    return [ProfissionaisRepository._normalize_profissional_row(item) for item in data]
                except Exception as exc:
                    last_exc = exc
                    if not ProfissionaisRepository._is_missing_profissionais_column_error(exc):
                        raise
            if last_exc:
                raise last_exc
            return []

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
        cargo = ProfissionaisRepository._normalize_optional_text(cargo)
        telefone = ProfissionaisRepository._normalize_optional_text(telefone)
        if is_db_ready():
            candidates = [
                (
                    "INSERT INTO profissionais (id, barbearia_id, nome, cargo, telefone, foto_url, comissao_percentual, ativo) VALUES (COALESCE(%s::uuid, gen_random_uuid()), %s, %s, %s, %s, %s, %s, true) RETURNING id, barbearia_id, nome, cargo, telefone, foto_url, comissao_percentual, ativo",
                    (profissional_id, barbearia_id, nome, cargo, telefone, foto_url, comissao_percentual),
                ),
                (
                    "INSERT INTO profissionais (id, barbearia_id, nome, cargo, telefone, foto_url, ativo) VALUES (COALESCE(%s::uuid, gen_random_uuid()), %s, %s, %s, %s, %s, true) RETURNING id, barbearia_id, nome, cargo, telefone, foto_url, ativo",
                    (profissional_id, barbearia_id, nome, cargo, telefone, foto_url),
                ),
                (
                    "INSERT INTO profissionais (id, barbearia_id, nome, cargo, telefone, ativo) VALUES (COALESCE(%s::uuid, gen_random_uuid()), %s, %s, %s, %s, true) RETURNING id, barbearia_id, nome, cargo, telefone, ativo",
                    (profissional_id, barbearia_id, nome, cargo, telefone),
                ),
                (
                    "INSERT INTO profissionais (id, barbearia_id, nome, cargo) VALUES (COALESCE(%s::uuid, gen_random_uuid()), %s, %s, %s) RETURNING id, barbearia_id, nome, cargo",
                    (profissional_id, barbearia_id, nome, cargo),
                ),
                (
                    "INSERT INTO profissionais (id, barbearia_id, nome) VALUES (COALESCE(%s::uuid, gen_random_uuid()), %s, %s) RETURNING id, barbearia_id, nome",
                    (profissional_id, barbearia_id, nome),
                ),
            ]
            last_exc = None
            for sql, params in candidates:
                try:
                    row = query_one(sql, params)
                    return ProfissionaisRepository._normalize_profissional_row(row)
                except Exception as exc:
                    last_exc = exc
                    if not ProfissionaisRepository._is_missing_profissionais_column_error(exc):
                        raise
            if last_exc:
                raise last_exc
            return None

        if is_supabase_ready():
            supabase = get_supabase_client()
            base_payload = {
                "barbearia_id": barbearia_id,
                "nome": nome,
                "cargo": cargo,
                "telefone": telefone,
                "foto_url": foto_url,
                "comissao_percentual": comissao_percentual,
                "ativo": True,
            }
            if profissional_id:
                base_payload["id"] = profissional_id

            payload_candidates = [
                dict(base_payload),
                {k: v for k, v in base_payload.items() if k != "comissao_percentual"},
                {k: v for k, v in base_payload.items() if k not in {"comissao_percentual", "foto_url"}},
                {k: v for k, v in base_payload.items() if k not in {"comissao_percentual", "foto_url", "telefone"}},
                {k: v for k, v in base_payload.items() if k not in {"comissao_percentual", "foto_url", "telefone", "ativo"}},
                {k: v for k, v in base_payload.items() if k not in {"comissao_percentual", "foto_url", "telefone", "ativo", "cargo"}},
            ]

            last_exc = None
            for payload in payload_candidates:
                try:
                    response = supabase.table("profissionais").insert(payload).execute()
                    data = response.data or []
                    if not data:
                        return None
                    return ProfissionaisRepository._normalize_profissional_row(data[0])
                except Exception as exc:
                    last_exc = exc
                    if not ProfissionaisRepository._is_missing_profissionais_column_error(exc):
                        raise
            if last_exc:
                raise last_exc
            return None

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
        cargo = ProfissionaisRepository._normalize_optional_text(cargo)
        telefone = ProfissionaisRepository._normalize_optional_text(telefone)
        if is_db_ready():
            candidates = [
                (
                    "UPDATE profissionais SET nome = %s, cargo = %s, telefone = %s, foto_url = %s, comissao_percentual = %s, ativo = %s WHERE barbearia_id = %s AND id = %s RETURNING id, barbearia_id, nome, cargo, telefone, foto_url, comissao_percentual, ativo",
                    (nome, cargo, telefone, foto_url, comissao_percentual, ativo, barbearia_id, profissional_id),
                ),
                (
                    "UPDATE profissionais SET nome = %s, cargo = %s, telefone = %s, foto_url = %s, ativo = %s WHERE barbearia_id = %s AND id = %s RETURNING id, barbearia_id, nome, cargo, telefone, foto_url, ativo",
                    (nome, cargo, telefone, foto_url, ativo, barbearia_id, profissional_id),
                ),
                (
                    "UPDATE profissionais SET nome = %s, cargo = %s, telefone = %s, ativo = %s WHERE barbearia_id = %s AND id = %s RETURNING id, barbearia_id, nome, cargo, telefone, ativo",
                    (nome, cargo, telefone, ativo, barbearia_id, profissional_id),
                ),
                (
                    "UPDATE profissionais SET nome = %s, cargo = %s, telefone = %s WHERE barbearia_id = %s AND id = %s RETURNING id, barbearia_id, nome, cargo, telefone",
                    (nome, cargo, telefone, barbearia_id, profissional_id),
                ),
                (
                    "UPDATE profissionais SET nome = %s, cargo = %s WHERE barbearia_id = %s AND id = %s RETURNING id, barbearia_id, nome, cargo",
                    (nome, cargo, barbearia_id, profissional_id),
                ),
                (
                    "UPDATE profissionais SET nome = %s WHERE barbearia_id = %s AND id = %s RETURNING id, barbearia_id, nome",
                    (nome, barbearia_id, profissional_id),
                ),
            ]
            last_exc = None
            for sql, params in candidates:
                try:
                    row = query_one(sql, params)
                    if not row:
                        return None
                    return ProfissionaisRepository._normalize_profissional_row(row)
                except Exception as exc:
                    last_exc = exc
                    if not ProfissionaisRepository._is_missing_profissionais_column_error(exc):
                        raise
            if last_exc:
                raise last_exc
            return None

        if is_supabase_ready():
            supabase = get_supabase_client()
            base_payload = {
                "nome": nome,
                "cargo": cargo,
                "telefone": telefone,
                "foto_url": foto_url,
                "comissao_percentual": comissao_percentual,
                "ativo": ativo,
            }

            payload_candidates = [
                dict(base_payload),
                {k: v for k, v in base_payload.items() if k != "comissao_percentual"},
                {k: v for k, v in base_payload.items() if k not in {"comissao_percentual", "foto_url"}},
                {k: v for k, v in base_payload.items() if k not in {"comissao_percentual", "foto_url", "telefone"}},
                {k: v for k, v in base_payload.items() if k not in {"comissao_percentual", "foto_url", "telefone", "ativo"}},
                {k: v for k, v in base_payload.items() if k not in {"comissao_percentual", "foto_url", "telefone", "ativo", "cargo"}},
            ]

            last_exc = None
            for payload in payload_candidates:
                try:
                    response = (
                        supabase.table("profissionais")
                        .update(payload)
                        .eq("barbearia_id", barbearia_id)
                        .eq("id", profissional_id)
                        .execute()
                    )
                    data = response.data or []
                    if not data:
                        return None
                    return ProfissionaisRepository._normalize_profissional_row(data[0])
                except Exception as exc:
                    last_exc = exc
                    if not ProfissionaisRepository._is_missing_profissionais_column_error(exc):
                        raise
            if last_exc:
                raise last_exc
            return None

        return None

    @staticmethod
    def delete(barbearia_id: str, profissional_id: str):
        ProfissionaisRepository.require_tenant(barbearia_id)
        if is_db_ready():
            candidates = [
                (
                    "UPDATE profissionais SET ativo = false WHERE barbearia_id = %s AND id = %s RETURNING id",
                    (barbearia_id, profissional_id),
                ),
                (
                    "DELETE FROM profissionais WHERE barbearia_id = %s AND id = %s RETURNING id",
                    (barbearia_id, profissional_id),
                ),
            ]

            last_exc = None
            for sql, params in candidates:
                try:
                    return query_one(sql, params)
                except Exception as exc:
                    last_exc = exc
                    if not ProfissionaisRepository._is_missing_profissionais_column_error(exc):
                        raise

            if last_exc:
                raise last_exc
            return None

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = (
                    supabase.table("profissionais")
                    .update({"ativo": False})
                    .eq("barbearia_id", barbearia_id)
                    .eq("id", profissional_id)
                    .execute()
                )
                data = response.data or []
                return data[0] if data else None
            except Exception as exc:
                if not ProfissionaisRepository._is_missing_profissionais_column_error(exc):
                    raise

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
