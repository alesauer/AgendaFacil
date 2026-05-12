"""Rotas para captura de leads da landing page"""

import re
from flask import Blueprint, request
from backend.repositories.marketing_leads_repository import MarketingLeadsRepository
from backend.services.marketing_leads_service import MarketingLeadsService
from backend.utils.http import error, success


marketing_leads_bp = Blueprint("marketing_leads", __name__)

# Regex para validar WhatsApp BR
WHATSAPP_REGEX = re.compile(r'^\+?55?\s*\(?([0-9]{2})\)?\s*[0-9]{4,5}-?[0-9]{4}$|^[0-9]{10,11}$')


def _validate_whatsapp(whatsapp: str) -> bool:
    """Validar formato básico do WhatsApp"""
    if not whatsapp:
        return False
    
    # Remover caracteres especiais
    clean = ''.join(c for c in whatsapp if c.isdigit())
    
    # Deve ter entre 10 e 13 dígitos (considerando +55)
    return 10 <= len(clean) <= 13


def _validate_name(name: str) -> bool:
    """Validar nome do lead"""
    if not name:
        return False
    
    clean = str(name).strip()
    # Mínimo 2 caracteres
    return len(clean) >= 2


@marketing_leads_bp.route("/api/leads", methods=["POST"])
@marketing_leads_bp.route("/leads", methods=["POST"])
def create_lead():
    """
    Criar novo lead a partir do modal da landing page
    
    POST /api/leads
    {
        "name": "João Silva",
        "whatsapp": "(11) 9 9999-9999"
    }
    """
    
    try:
        data = request.get_json() or {}
    except Exception:
        return error("JSON inválido", 400)
    
    name = str(data.get("name", "")).strip()
    whatsapp = str(data.get("whatsapp", "")).strip()
    
    # Validações
    if not _validate_name(name):
        return error("Nome inválido (mínimo 2 caracteres)", 400)
    
    if not _validate_whatsapp(whatsapp):
        return error("WhatsApp inválido", 400)
    
    # Normalizar WhatsApp
    whatsapp_clean = ''.join(c for c in whatsapp if c.isdigit())
    
    # Capturar IP e User-Agent
    ip_address = request.headers.get("X-Forwarded-For", request.remote_addr)
    if "," in str(ip_address):
        ip_address = str(ip_address).split(",")[0].strip()
    
    user_agent = request.headers.get("User-Agent", "")
    
    try:
        # Criar lead no BD
        lead = MarketingLeadsRepository.create(
            name=name,
            whatsapp=whatsapp_clean,
            source="landing_vercel",
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        lead_id = lead.get("id")
        
        # Disparar WhatsApp assincronamente
        # (Em produção, isso seria uma job no Celery/Redis)
        # Por enquanto, fazer sincronamente
        send_result = MarketingLeadsService.send_warmup_welcome(
            lead_id=lead_id,
            name=name,
            whatsapp=whatsapp_clean
        )
        
        if not send_result.get("success"):
            return error(
                f"Lead criado mas falha ao enviar WhatsApp: {send_result.get('error')}",
                201  # Ainda retornar 201 porque lead foi criado
            )
        
        return success({
            "lead_id": lead_id,
            "message": "Lead capturado com sucesso. Verifique seu WhatsApp!"
        }, 201)
        
    except ValueError as ve:
        return error(str(ve), 400)
    except Exception as exc:
        return error(f"Erro ao criar lead: {str(exc)}", 500)


@marketing_leads_bp.route("/api/leads/<lead_id>", methods=["GET"])
@marketing_leads_bp.route("/leads/<lead_id>", methods=["GET"])
def get_lead(lead_id: str):
    """
    Buscar dados do lead por ID (usado no onboarding auto-provisionado)
    
    GET /api/leads/{lead_id}
    """
    
    try:
        lead = MarketingLeadsRepository.get_by_id(lead_id)
        
        if not lead:
            return error("Lead não encontrado", 404)
        
        return success({
            "id": lead.get("id"),
            "name": lead.get("name"),
            "whatsapp": lead.get("whatsapp"),
            "status": lead.get("status"),
            "created_at": lead.get("created_at")
        })
        
    except Exception as exc:
        return error(f"Erro ao buscar lead: {str(exc)}", 500)


@marketing_leads_bp.route("/api/leads/<lead_id>/track-click", methods=["POST"])
@marketing_leads_bp.route("/leads/<lead_id>/track-click", methods=["POST"])
def track_click(lead_id: str):
    """
    Rastrear quando lead clica no link do WhatsApp
    
    POST /api/leads/{lead_id}/track-click
    """
    
    try:
        lead = MarketingLeadsRepository.get_by_id(lead_id)
        
        if not lead:
            return error("Lead não encontrado", 404)
        
        # Atualizar timestamp de clique
        from datetime import datetime
        MarketingLeadsRepository.update(lead_id, {
            "link_clicked_at": datetime.utcnow().isoformat(),
            "last_interaction_at": datetime.utcnow().isoformat(),
            "status": "ONBOARDING"
        })
        
        return success({"message": "Clique registrado"})
        
    except Exception as exc:
        return error(f"Erro ao rastrear: {str(exc)}", 500)


@marketing_leads_bp.route("/api/leads/<lead_id>/convert-to-barbearia", methods=["POST"])
@marketing_leads_bp.route("/leads/<lead_id>/convert-to-barbearia", methods=["POST"])
def convert_to_barbearia(lead_id: str):
    """
    Converter lead para barbearia ativa (quando completa onboarding)
    
    POST /api/leads/{lead_id}/convert-to-barbearia
    {
        "barbearia_id": "uuid",
        "user_id": "uuid"
    }
    """
    
    try:
        data = request.get_json() or {}
        barbearia_id = data.get("barbearia_id")
        user_id = data.get("user_id")
        
        if not barbearia_id or not user_id:
            return error("barbearia_id e user_id são obrigatórios", 400)
        
        # Atualizar lead como PAYING (vai buscar depois)
        from datetime import datetime
        MarketingLeadsRepository.update(lead_id, {
            "status": "PAYING",
            "last_interaction_at": datetime.utcnow().isoformat()
        })
        
        return success({
            "message": "Lead convertido para cliente",
            "lead_id": lead_id,
            "barbearia_id": barbearia_id
        })
        
    except Exception as exc:
        return error(f"Erro ao converter: {str(exc)}", 500)
