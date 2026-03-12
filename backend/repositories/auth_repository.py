from backend.db import is_db_ready, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class AuthRepository(BaseRepository):
    @staticmethod
    def find_user_by_phone(barbearia_id: str, phone: str):
        AuthRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT id, barbearia_id, nome, telefone, senha_hash, role, ativo
                FROM usuarios
                WHERE barbearia_id = %s AND telefone = %s
                """,
                (barbearia_id, phone),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("usuarios")
                .select("id,barbearia_id,nome,telefone,senha_hash,role,ativo")
                .eq("barbearia_id", barbearia_id)
                .eq("telefone", phone)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def create_user(barbearia_id: str, nome: str, telefone: str, senha_hash: str, role: str):
        AuthRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                INSERT INTO usuarios (barbearia_id, nome, telefone, senha_hash, role, ativo)
                VALUES (%s, %s, %s, %s, %s, true)
                RETURNING id, barbearia_id, nome, telefone, role, ativo
                """,
                (barbearia_id, nome, telefone, senha_hash, role),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            insert_payload = {
                "barbearia_id": barbearia_id,
                "nome": nome,
                "telefone": telefone,
                "senha_hash": senha_hash,
                "role": role,
                "ativo": True,
            }
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
                SELECT id, barbearia_id, nome, telefone, role, ativo
                FROM usuarios
                WHERE barbearia_id = %s AND id = %s
                """,
                (barbearia_id, user_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("usuarios")
                .select("id,barbearia_id,nome,telefone,role,ativo")
                .eq("barbearia_id", barbearia_id)
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None
