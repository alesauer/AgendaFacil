from datetime import datetime
from backend.db import execute, is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class MarketingLeadsRepository(BaseRepository):
    """Repository para gerenciar leads da landing page (modal)"""

    @staticmethod
    def _is_missing_table_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return (
            "relation" in message and "does not exist" in message and "marketing_leads" in message
        ) or (
            "could not find" in message and "marketing_leads" in message
        )

    @staticmethod
    def create(name: str, whatsapp: str, source: str = "landing_vercel", 
               ip_address: str = None, user_agent: str = None) -> dict:
        """Criar novo lead"""
        if not name or not whatsapp:
            raise ValueError("name e whatsapp são obrigatórios")
        
        # Normalizar WhatsApp (remover caracteres especiais)
        whatsapp_clean = ''.join(c for c in whatsapp if c.isdigit())
        if len(whatsapp_clean) < 10:
            raise ValueError("WhatsApp deve ter pelo menos 10 dígitos")
        
        if is_db_ready():
            try:
                row = query_one(
                    """
                    INSERT INTO public.marketing_leads 
                    (name, whatsapp, source, ip_address, user_agent, first_interaction_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    RETURNING id
                    """,
                    (name, whatsapp_clean, source, ip_address, user_agent),
                )
                return {"id": row.get("id") if isinstance(row, dict) else None}
            except Exception as exc:
                # Se já existe (unique constraint), buscar o existente
                if "unique constraint" in str(exc).lower():
                    return query_one(
                        "SELECT id FROM public.marketing_leads WHERE whatsapp = %s LIMIT 1",
                        (whatsapp_clean,)
                    )
                if not MarketingLeadsRepository._is_missing_table_error(exc):
                    raise

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = supabase.table("marketing_leads").insert({
                    "name": name,
                    "whatsapp": whatsapp_clean,
                    "source": source,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "first_interaction_at": datetime.utcnow().isoformat()
                }).execute()
                
                if response.data:
                    return response.data[0]
                raise Exception("Falha ao inserir lead no Supabase")
            except Exception as exc:
                if "unique constraint" in str(exc).lower() or "duplicate key" in str(exc).lower():
                    # Buscar lead existente
                    response = supabase.table("marketing_leads")\
                        .select("id")\
                        .eq("whatsapp", whatsapp_clean)\
                        .limit(1)\
                        .execute()
                    if response.data:
                        return response.data[0]
                raise

    @staticmethod
    def get_by_id(lead_id: str) -> dict:
        """Buscar lead por ID"""
        if is_db_ready():
            try:
                return query_one(
                    "SELECT * FROM public.marketing_leads WHERE id = %s LIMIT 1",
                    (lead_id,)
                )
            except Exception as exc:
                if not MarketingLeadsRepository._is_missing_table_error(exc):
                    raise

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = supabase.table("marketing_leads")\
                .select("*")\
                .eq("id", lead_id)\
                .limit(1)\
                .execute()
            return response.data[0] if response.data else None

    @staticmethod
    def get_by_whatsapp(whatsapp: str) -> dict:
        """Buscar lead por WhatsApp"""
        # Normalizar
        whatsapp_clean = ''.join(c for c in whatsapp if c.isdigit())
        
        if is_db_ready():
            try:
                return query_one(
                    "SELECT * FROM public.marketing_leads WHERE whatsapp = %s LIMIT 1",
                    (whatsapp_clean,)
                )
            except Exception as exc:
                if not MarketingLeadsRepository._is_missing_table_error(exc):
                    raise

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = supabase.table("marketing_leads")\
                .select("*")\
                .eq("whatsapp", whatsapp_clean)\
                .limit(1)\
                .execute()
            return response.data[0] if response.data else None

    @staticmethod
    def update(lead_id: str, data: dict) -> dict:
        """Atualizar lead"""
        if not data:
            return MarketingLeadsRepository.get_by_id(lead_id)

        # Montar colunas seguras para update
        allowed_fields = {
            "status", "validation_status", "last_interaction_at",
            "whatsapp_sent_at", "whatsapp_opened_at", "link_clicked_at"
        }
        safe_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not safe_data:
            return MarketingLeadsRepository.get_by_id(lead_id)

        if is_db_ready():
            try:
                set_clause = ", ".join([f"{k} = %s" for k in safe_data.keys()])
                values = list(safe_data.values()) + [lead_id]

                execute(
                    f"UPDATE public.marketing_leads SET {set_clause} WHERE id = %s",
                    values
                )
                return MarketingLeadsRepository.get_by_id(lead_id)
            except Exception as exc:
                if not MarketingLeadsRepository._is_missing_table_error(exc):
                    raise

        if is_supabase_ready():
            supabase = get_supabase_client()
            supabase.table("marketing_leads")\
                .update(safe_data)\
                .eq("id", lead_id)\
                .execute()
            return MarketingLeadsRepository.get_by_id(lead_id)

    @staticmethod
    def list_by_status(status: str, limit: int = 100) -> list:
        """Listar leads por status"""
        if is_db_ready():
            try:
                return query_all(
                    "SELECT * FROM public.marketing_leads WHERE status = %s ORDER BY created_at DESC LIMIT %s",
                    (status, limit)
                )
            except Exception as exc:
                if not MarketingLeadsRepository._is_missing_table_error(exc):
                    raise

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = supabase.table("marketing_leads")\
                .select("*")\
                .eq("status", status)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            return response.data or []

    @staticmethod
    def list_pending_validation(limit: int = 50) -> list:
        """Listar leads com validação pendente"""
        if is_db_ready():
            try:
                return query_all(
                    """
                    SELECT * FROM public.marketing_leads 
                    WHERE validation_status = 'PENDING' 
                    ORDER BY created_at ASC 
                    LIMIT %s
                    """,
                    (limit,)
                )
            except Exception as exc:
                if not MarketingLeadsRepository._is_missing_table_error(exc):
                    raise

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = supabase.table("marketing_leads")\
                .select("*")\
                .eq("validation_status", "PENDING")\
                .order("created_at", desc=False)\
                .limit(limit)\
                .execute()
            return response.data or []
