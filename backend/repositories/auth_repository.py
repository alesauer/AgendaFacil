from backend.db import is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class AuthRepository(BaseRepository):
    @staticmethod
    def find_user_by_phone(barbearia_id: str, phone: str):
        AuthRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT id, barbearia_id, nome, telefone, email, senha_hash, role, ativo
                FROM usuarios
                WHERE barbearia_id = %s AND telefone = %s
                """,
                (barbearia_id, phone),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("usuarios")
                .select("id,barbearia_id,nome,telefone,email,senha_hash,role,ativo")
                .eq("barbearia_id", barbearia_id)
                .eq("telefone", phone)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def create_user(
        barbearia_id: str,
        nome: str,
        telefone: str,
        senha_hash: str,
        role: str,
        email: str | None = None,
        user_id: str | None = None,
    ):
        AuthRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                INSERT INTO usuarios (id, barbearia_id, nome, telefone, email, senha_hash, role, ativo)
                VALUES (COALESCE(%s::uuid, gen_random_uuid()), %s, %s, %s, %s, %s, %s, true)
                RETURNING id, barbearia_id, nome, telefone, email, role, ativo
                """,
                (user_id, barbearia_id, nome, telefone, email, senha_hash, role),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            insert_payload = {
                "barbearia_id": barbearia_id,
                "nome": nome,
                "telefone": telefone,
                "email": email,
                "senha_hash": senha_hash,
                "role": role,
                "ativo": True,
            }
            if user_id:
                insert_payload["id"] = user_id
            response = (
                supabase.table("usuarios")
                .insert(insert_payload)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def find_user_by_id(barbearia_id: str, user_id: str):
        AuthRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT id, barbearia_id, nome, telefone, email, role, ativo
                FROM usuarios
                WHERE barbearia_id = %s AND id = %s
                """,
                (barbearia_id, user_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("usuarios")
                .select("id,barbearia_id,nome,telefone,email,role,ativo")
                .eq("barbearia_id", barbearia_id)
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def find_user_by_email(barbearia_id: str, email: str):
        AuthRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT id, barbearia_id, nome, telefone, email, senha_hash, role, ativo
                FROM usuarios
                WHERE barbearia_id = %s AND email = %s
                """,
                (barbearia_id, email),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("usuarios")
                .select("id,barbearia_id,nome,telefone,email,senha_hash,role,ativo")
                .eq("barbearia_id", barbearia_id)
                .eq("email", email)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def list_users(barbearia_id: str):
        AuthRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT id, barbearia_id, nome, telefone, email, role, ativo
                FROM usuarios
                WHERE barbearia_id = %s
                ORDER BY nome
                """,
                (barbearia_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("usuarios")
                .select("id,barbearia_id,nome,telefone,email,role,ativo")
                .eq("barbearia_id", barbearia_id)
                .order("nome")
                .execute()
            )
            return response.data or []

        return []

    @staticmethod
    def update_user(
        barbearia_id: str,
        user_id: str,
        nome: str,
        telefone: str,
        email: str | None,
        role: str,
        ativo: bool,
        senha_hash: str | None,
    ):
        AuthRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                UPDATE usuarios
                SET nome = %s,
                    telefone = %s,
                    email = %s,
                    role = %s,
                    ativo = %s,
                    senha_hash = CASE WHEN %s IS NULL THEN senha_hash ELSE %s END
                WHERE barbearia_id = %s AND id = %s
                RETURNING id, barbearia_id, nome, telefone, email, role, ativo
                """,
                (
                    nome,
                    telefone,
                    email,
                    role,
                    ativo,
                    senha_hash,
                    senha_hash,
                    barbearia_id,
                    user_id,
                ),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            payload = {
                "nome": nome,
                "telefone": telefone,
                "email": email,
                "role": role,
                "ativo": ativo,
            }
            if senha_hash is not None:
                payload["senha_hash"] = senha_hash

            response = (
                supabase.table("usuarios")
                .update(payload)
                .eq("barbearia_id", barbearia_id)
                .eq("id", user_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def delete_user(barbearia_id: str, user_id: str):
        AuthRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                DELETE FROM usuarios
                WHERE barbearia_id = %s AND id = %s
                RETURNING id
                """,
                (barbearia_id, user_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("usuarios")
                .delete()
                .eq("barbearia_id", barbearia_id)
                .eq("id", user_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None
