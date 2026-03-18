from backend.db import is_db_ready, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class BarbeariaRepository(BaseRepository):
    @staticmethod
    def _coalesce_identity_fields(item: dict | None):
        if not item:
            return None
        base = dict(item)
        base.setdefault("logo_url", None)
        base.setdefault("login_logo_url", None)
        base.setdefault("login_background_url", None)
        base.setdefault("icone_marca", None)
        base.setdefault("cor_primaria", None)
        base.setdefault("cor_secundaria", None)
        return base

    @staticmethod
    def get_identity(barbearia_id: str):
        BarbeariaRepository.require_tenant(barbearia_id)
        if is_db_ready():
            try:
                item = query_one(
                    """
                    SELECT id, nome, slug, telefone, cidade,
                           logo_url, login_logo_url, login_background_url,
                           icone_marca, cor_primaria, cor_secundaria
                    FROM barbearias
                    WHERE id = %s
                    """,
                    (barbearia_id,),
                )
                return BarbeariaRepository._coalesce_identity_fields(item)
            except Exception:
                item = query_one(
                    """
                    SELECT id, nome, slug, telefone, cidade,
                           NULL::text AS logo_url,
                              NULL::text AS login_logo_url,
                              NULL::text AS login_background_url,
                           NULL::text AS icone_marca,
                           NULL::text AS cor_primaria,
                           NULL::text AS cor_secundaria
                    FROM barbearias
                    WHERE id = %s
                    """,
                    (barbearia_id,),
                )
                return BarbeariaRepository._coalesce_identity_fields(item)

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = (
                    supabase.table("barbearias")
                    .select("id,nome,slug,telefone,cidade,logo_url,login_logo_url,login_background_url,icone_marca,cor_primaria,cor_secundaria")
                    .eq("id", barbearia_id)
                    .limit(1)
                    .execute()
                )
                data = response.data or []
                return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)
            except Exception:
                response = (
                    supabase.table("barbearias")
                    .select("id,nome,slug,telefone,cidade")
                    .eq("id", barbearia_id)
                    .limit(1)
                    .execute()
                )
                data = response.data or []
                return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)

        return None

    @staticmethod
    def update_identity(
        barbearia_id: str,
        nome: str,
        logo_url: str | None,
        login_logo_url: str | None,
        login_background_url: str | None,
        icone_marca: str | None,
        cor_primaria: str | None,
        cor_secundaria: str | None,
    ):
        BarbeariaRepository.require_tenant(barbearia_id)
        if is_db_ready():
            try:
                item = query_one(
                    """
                    UPDATE barbearias
                    SET nome = %s,
                        logo_url = %s,
                        login_logo_url = %s,
                        login_background_url = %s,
                        icone_marca = %s,
                        cor_primaria = %s,
                        cor_secundaria = %s
                    WHERE id = %s
                    RETURNING id, nome, slug, telefone, cidade,
                              logo_url, login_logo_url, login_background_url,
                              icone_marca, cor_primaria, cor_secundaria
                    """,
                    (
                        nome,
                        logo_url,
                        login_logo_url,
                        login_background_url,
                        icone_marca,
                        cor_primaria,
                        cor_secundaria,
                        barbearia_id,
                    ),
                )
                return BarbeariaRepository._coalesce_identity_fields(item)
            except Exception:
                item = query_one(
                    """
                    UPDATE barbearias
                    SET nome = %s
                    WHERE id = %s
                    RETURNING id, nome, slug, telefone, cidade,
                              NULL::text AS logo_url,
                              NULL::text AS login_logo_url,
                              NULL::text AS login_background_url,
                              NULL::text AS icone_marca,
                              NULL::text AS cor_primaria,
                              NULL::text AS cor_secundaria
                    """,
                    (nome, barbearia_id),
                )
                return BarbeariaRepository._coalesce_identity_fields(item)

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = (
                    supabase.table("barbearias")
                    .update(
                        {
                            "nome": nome,
                            "logo_url": logo_url,
                            "login_logo_url": login_logo_url,
                            "login_background_url": login_background_url,
                            "icone_marca": icone_marca,
                            "cor_primaria": cor_primaria,
                            "cor_secundaria": cor_secundaria,
                        }
                    )
                    .eq("id", barbearia_id)
                    .execute()
                )
                data = response.data or []
                return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)
            except Exception:
                response = (
                    supabase.table("barbearias")
                    .update({"nome": nome})
                    .eq("id", barbearia_id)
                    .execute()
                )
                data = response.data or []
                return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)

        return None
