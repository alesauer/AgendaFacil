"""Serviço para gerenciar leads da landing page com integração WhatsApp"""

import requests
from datetime import datetime
from backend.repositories.marketing_leads_repository import MarketingLeadsRepository
from backend.services.master_runtime_config_service import MasterRuntimeConfigService


class MarketingLeadsService:
    """Serviço para disparar mensagens e gerenciar leads da landing page"""

    RETRY_DELAYS_SECONDS = (60, 300, 900)

    @staticmethod
    def _get_evolution_config() -> dict:
        """Obter configuração do Evolution para master/global"""
        return {
            "base_url": str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_BASE_URL", "") or "").strip(),
            "instance": str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_INSTANCE", "") or "").strip(),
            "api_key": str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_KEY", "") or "").strip(),
            "api_key_header": str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_API_KEY_HEADER", "apikey") or "apikey").strip(),
            "send_path": str(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_SEND_TEXT_PATH", "/message/sendText/{instance}") or "").strip(),
            "timeout": int(MasterRuntimeConfigService.get_runtime_value("EVOLUTION_HTTP_TIMEOUT_SECONDS", 30) or 30),
        }

    @staticmethod
    def _to_e164(phone: str) -> str:
        """Converter número para formato E.164 (apenas dígitos com código país BR)"""
        digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
        if not digits:
            return digits
        if digits.startswith("55"):
            return digits
        return f"55{digits}"

    @staticmethod
    def _build_evolution_url(config: dict) -> str:
        """Construir URL do Evolution"""
        base_url = config.get("base_url", "").rstrip("/")
        instance = config.get("instance", "")
        send_path = config.get("send_path", "/message/sendText/{instance}")
        
        if not base_url or not instance:
            raise ValueError("EVOLUTION_API_BASE_URL ou EVOLUTION_INSTANCE não configurados")
        
        path = send_path.replace("{instance}", instance)
        return f"{base_url}{path}"

    @staticmethod
    def _candidate_evolution_urls(config: dict) -> list[str]:
        base_url = config.get("base_url", "").rstrip("/")
        instance = config.get("instance", "")
        configured_path = config.get("send_path", "/message/sendText/{instance}")

        if not base_url or not instance:
            return []

        candidates = [
            configured_path,
            "/message/sendText/{instance}",
            "/message/sendText/{instance}/",
            "/message/sendText",
            "/message/sendText/",
        ]

        urls: list[str] = []
        seen: set[str] = set()
        for candidate in candidates:
            path = str(candidate or "").replace("{instance}", instance)
            if not path.startswith("/"):
                path = f"/{path}"
            final_url = f"{base_url}{path}"
            if final_url in seen:
                continue
            seen.add(final_url)
            urls.append(final_url)
        return urls

    @staticmethod
    def send_warmup_welcome(lead_id: str, name: str, whatsapp: str) -> dict:
        """
        Disparar mensagem de boas-vindas no WhatsApp do lead (D0)
        
        Args:
            lead_id: UUID do lead
            name: Nome do lead
            whatsapp: WhatsApp (com ou sem formatação)
            
        Returns:
            dict com status do envio
        """
        try:
            config = MarketingLeadsService._get_evolution_config()
            
            if not config.get("base_url") or not config.get("instance"):
                return {
                    "success": False,
                    "error": "Evolution não configurado",
                    "lead_id": lead_id
                }
            
            first_name = (name or "").split()[0] if name else "Barbeiro"
            phone_e164 = MarketingLeadsService._to_e164(whatsapp)
            
            # Mensagem de warmup
            message = f"""Oi {first_name}! 🚀

Recebemos seu interesse em AgendaFácil!

Clique aqui pra criar sua barbearia em 3 passos:
https://app.barbeiros.app/#/onboarding?lead_id={lead_id}

Quer saber como começar? Estamos aqui pra ajudar! 💬"""
            
            # Construir payload
            headers = {"Content-Type": "application/json"}
            
            if config.get("api_key"):
                headers[config.get("api_key_header", "apikey")] = config.get("api_key")
            
            payload = {
                "number": phone_e164,
                "text": message
            }
            
            # Enviar via Evolution com fallback de endpoint
            response = None
            result = {}
            last_error = ""

            for candidate_url in MarketingLeadsService._candidate_evolution_urls(config):
                try:
                    candidate_response = requests.post(
                        candidate_url,
                        json=payload,
                        headers=headers,
                        timeout=config.get("timeout", 30)
                    )

                    candidate_result = candidate_response.json() if candidate_response.text else {}

                    if candidate_response.status_code != 404:
                        response = candidate_response
                        result = candidate_result
                        break

                    last_error = str(
                        candidate_result.get("message")
                        or candidate_result.get("error")
                        or "Not Found"
                    )
                except Exception as request_exc:
                    last_error = str(request_exc)

            if response is None:
                return {
                    "success": False,
                    "lead_id": lead_id,
                    "error": last_error or "Falha ao enviar mensagem no Evolution",
                    "status_code": 404,
                }
            
            # Se bem-sucedido, atualizar lead
            if response.status_code < 400:
                MarketingLeadsRepository.update(lead_id, {
                    "whatsapp_sent_at": datetime.utcnow().isoformat(),
                    "validation_status": "VALID",
                    "status": "ONBOARDING"
                })
                
                return {
                    "success": True,
                    "lead_id": lead_id,
                    "provider_response": result
                }
            
            # Se erro, marcar como inválido se 404 ou erro do número
            if response.status_code >= 400:
                error_msg = str(result.get("message") or result.get("error") or "Erro no Evolution")
                
                # Se problema no número, marcar como inválido
                if any(x in error_msg.lower() for x in ["number", "invalid", "não encontrado"]):
                    MarketingLeadsRepository.update(lead_id, {
                        "validation_status": "INVALID",
                        "status": "PROSPECT"
                    })
                
                return {
                    "success": False,
                    "lead_id": lead_id,
                    "error": error_msg,
                    "status_code": response.status_code
                }
            
        except Exception as exc:
            return {
                "success": False,
                "lead_id": lead_id,
                "error": str(exc)
            }

    @staticmethod
    def enqueue_warmup_dispatch(lead_id: str) -> None:
        try:
            MarketingLeadsRepository.update(lead_id, {
                "whatsapp_dispatch_status": "PENDING",
                "whatsapp_next_retry_at": datetime.utcnow().isoformat(),
                "whatsapp_last_error": None,
            })
        except Exception:
            return None

    @staticmethod
    def _next_retry_at(attempts: int) -> datetime | None:
        if attempts <= 0:
            return datetime.utcnow()
        index = min(attempts - 1, len(MarketingLeadsService.RETRY_DELAYS_SECONDS) - 1)
        delay_seconds = MarketingLeadsService.RETRY_DELAYS_SECONDS[index]
        if attempts > len(MarketingLeadsService.RETRY_DELAYS_SECONDS):
            return None
        from datetime import timedelta

        return datetime.utcnow() + timedelta(seconds=delay_seconds)

    @staticmethod
    def process_pending_warmup_dispatches(limit: int = 50) -> dict:
        leads = MarketingLeadsRepository.list_pending_whatsapp_dispatch(limit=limit)
        if not leads:
            return {"picked": 0, "sent": 0, "failed": 0, "scheduled_retry": 0}

        sent = 0
        failed = 0
        scheduled_retry = 0

        for lead in leads:
            lead_id = str(lead.get("id") or "")
            if not lead_id:
                continue

            name = str(lead.get("name") or "").strip()
            whatsapp = str(lead.get("whatsapp") or "").strip()
            attempts = int(lead.get("whatsapp_dispatch_attempts") or 0)

            result = MarketingLeadsService.send_warmup_welcome(
                lead_id=lead_id,
                name=name,
                whatsapp=whatsapp,
            )

            if result.get("success"):
                MarketingLeadsRepository.update(lead_id, {
                    "whatsapp_dispatch_status": "SENT",
                    "whatsapp_dispatch_attempts": attempts + 1,
                    "whatsapp_last_error": None,
                    "whatsapp_next_retry_at": None,
                })
                sent += 1
                continue

            error_msg = str(result.get("error") or "Falha no envio")
            next_retry = MarketingLeadsService._next_retry_at(attempts + 1)
            if next_retry is None:
                MarketingLeadsRepository.update(lead_id, {
                    "whatsapp_dispatch_status": "FAILED",
                    "whatsapp_dispatch_attempts": attempts + 1,
                    "whatsapp_last_error": error_msg,
                    "whatsapp_next_retry_at": None,
                })
                failed += 1
            else:
                MarketingLeadsRepository.update(lead_id, {
                    "whatsapp_dispatch_status": "RETRY",
                    "whatsapp_dispatch_attempts": attempts + 1,
                    "whatsapp_last_error": error_msg,
                    "whatsapp_next_retry_at": next_retry.isoformat(),
                })
                scheduled_retry += 1

        return {
            "picked": len(leads),
            "sent": sent,
            "failed": failed,
            "scheduled_retry": scheduled_retry,
        }

    @staticmethod
    def send_reengagement_d1(lead_id: str, name: str, whatsapp: str) -> dict:
        """Enviar mensagem de reengajamento D1 (24h depois)"""
        first_name = (name or "").split()[0] if name else "Barbeiro"
        
        # Usar o mesmo sistema do warmup, mas com mensagem diferente
        try:
            config = MarketingLeadsService._get_evolution_config()
            url = MarketingLeadsService._build_evolution_url(config)
            
            phone_e164 = MarketingLeadsService._to_e164(whatsapp)
            message = f"""Oi {first_name}! 👋

Ficou com dúvida? Estamos aqui pra ajudar!

Retome sua agenda: https://app.barbeiros.app/#/onboarding?lead_id={lead_id}

Qualquer dúvida, é só chamar! 💬"""
            
            headers = {"Content-Type": "application/json"}
            if config.get("api_key"):
                headers[config.get("api_key_header", "apikey")] = config.get("api_key")
            
            payload = {
                "number": phone_e164,
                "text": message
            }
            
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=config.get("timeout", 30)
            )
            
            return {"success": response.status_code < 400}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    @staticmethod
    def send_reengagement_d3(lead_id: str, name: str, whatsapp: str, barbeiro_exemplo: str = "João") -> dict:
        """Enviar mensagem de reengajamento D3 (72h depois)"""
        first_name = (name or "").split()[0] if name else "Barbeiro"
        
        try:
            config = MarketingLeadsService._get_evolution_config()
            url = MarketingLeadsService._build_evolution_url(config)
            
            phone_e164 = MarketingLeadsService._to_e164(whatsapp)
            message = f"""Oi {first_name}! 📱

Veja como {barbeiro_exemplo} tá ganhando mais com AgendaFácil:
✅ Agendas automáticas
✅ Sem no-shows
✅ Mais faturamento

Quer fazer o mesmo? 👇
https://app.barbeiros.app/#/onboarding?lead_id={lead_id}"""
            
            headers = {"Content-Type": "application/json"}
            if config.get("api_key"):
                headers[config.get("api_key_header", "apikey")] = config.get("api_key")
            
            payload = {
                "number": phone_e164,
                "text": message
            }
            
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=config.get("timeout", 30)
            )
            
            return {"success": response.status_code < 400}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    @staticmethod
    def send_reengagement_d7(lead_id: str, name: str, whatsapp: str) -> dict:
        """Enviar mensagem de reengajamento D7 (1 semana depois)"""
        first_name = (name or "").split()[0] if name else "Barbeiro"
        
        try:
            config = MarketingLeadsService._get_evolution_config()
            url = MarketingLeadsService._build_evolution_url(config)
            
            phone_e164 = MarketingLeadsService._to_e164(whatsapp)
            message = f"""Oi {first_name}! ⏰

Sua agenda FREE tá pronta e funcionando!

Quer desbloquear:
🔓 Agendamentos ilimitados
🔓 Cobranças automáticas
🔓 Relatórios pro

Por apenas R$29/mês (primeiros 3 meses -30%)

Ativa agora? 👇
https://app.barbeiros.app/#/onboarding?lead_id={lead_id}"""
            
            headers = {"Content-Type": "application/json"}
            if config.get("api_key"):
                headers[config.get("api_key_header", "apikey")] = config.get("api_key")
            
            payload = {
                "number": phone_e164,
                "text": message
            }
            
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=config.get("timeout", 30)
            )
            
            if response.status_code < 400:
                # Se passou de D7 sem converter, marcar como COLD_LEAD
                MarketingLeadsRepository.update(lead_id, {
                    "status": "COLD"
                })
            
            return {"success": response.status_code < 400}
        except Exception as exc:
            return {"success": False, "error": str(exc)}
