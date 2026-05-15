"""Serviço para gerenciar leads da landing page com integração WhatsApp"""

import requests
from datetime import datetime, timedelta, timezone
import jwt
from flask import current_app
from backend.repositories.marketing_leads_repository import MarketingLeadsRepository
from backend.services.master_runtime_config_service import MasterRuntimeConfigService


class MarketingLeadsService:
    """Serviço para disparar mensagens e gerenciar leads da landing page"""

    RETRY_DELAYS_SECONDS = (60, 300, 900)

    @staticmethod
    def _frontend_base_url() -> str:
        configured = str(current_app.config.get("FRONTEND_APP_URL") or "").strip().rstrip("/")
        if configured:
            return configured
        return "https://app.barbeiros.app"

    @staticmethod
    def create_lead_access_token(lead_id: str) -> str:
        if not lead_id:
            raise ValueError("lead_id é obrigatório")

        expires_minutes = int(current_app.config.get("LEAD_ACCESS_TOKEN_EXPIRES_MINUTES", 10080) or 10080)
        now = datetime.now(timezone.utc)
        payload = {
            "typ": "lead_access",
            "sub": str(lead_id),
            "iat": now,
            "exp": now + timedelta(minutes=max(5, expires_minutes)),
        }
        return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")

    @staticmethod
    def resolve_lead_access_token(token: str) -> dict:
        if not token:
            raise ValueError("token de acesso não informado")

        try:
            payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        except jwt.ExpiredSignatureError as exc:
            raise ValueError("Token expirado") from exc
        except jwt.InvalidTokenError as exc:
            raise ValueError("Token inválido") from exc

        token_type = str(payload.get("typ") or "").strip().lower()
        lead_id = str(payload.get("sub") or "").strip()

        if token_type != "lead_access" or not lead_id:
            raise ValueError("Token inválido")

        lead = MarketingLeadsRepository.get_by_id(lead_id)
        if not lead:
            raise ValueError("Lead não encontrado")

        return {
            "lead_id": lead_id,
            "lead": lead,
        }

    @staticmethod
    def build_lead_onboarding_url(lead_id: str) -> str:
        token = MarketingLeadsService.create_lead_access_token(lead_id)
        base_url = MarketingLeadsService._frontend_base_url()
        return f"{base_url}/#/lead-onboarding/{token}"

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
    def _candidate_evolution_headers(config: dict) -> list[dict]:
        headers_base = {"Content-Type": "application/json"}
        api_key = str(config.get("api_key") or "").strip()
        configured_header = str(config.get("api_key_header") or "apikey").strip()

        if not api_key:
            return [headers_base]

        candidates = [
            (configured_header, api_key),
            ("apikey", api_key),
            ("Authorization", f"Bearer {api_key}"),
        ]

        final_headers: list[dict] = []
        seen: set[tuple[tuple[str, str], ...]] = set()
        for header_name, header_value in candidates:
            merged = dict(headers_base)
            merged[header_name] = header_value
            fingerprint = tuple(sorted((str(k), str(v)) for k, v in merged.items()))
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            final_headers.append(merged)
        return final_headers

    @staticmethod
    def _send_text_via_evolution(config: dict, phone_e164: str, message: str) -> dict:
        payload = {
            "number": phone_e164,
            "text": message,
        }

        response = None
        result = {}
        last_error = ""
        last_status_code = None

        for candidate_headers in MarketingLeadsService._candidate_evolution_headers(config):
            for candidate_url in MarketingLeadsService._candidate_evolution_urls(config):
                try:
                    candidate_response = requests.post(
                        candidate_url,
                        json=payload,
                        headers=candidate_headers,
                        timeout=config.get("timeout", 30),
                    )
                    candidate_result = candidate_response.json() if candidate_response.text else {}
                    candidate_status = int(candidate_response.status_code)

                    if candidate_status < 400:
                        return {
                            "success": True,
                            "status_code": candidate_status,
                            "provider_response": candidate_result,
                        }

                    last_status_code = candidate_status
                    last_error = str(
                        candidate_result.get("message")
                        or candidate_result.get("error")
                        or f"Erro HTTP {candidate_status}"
                    )

                    if candidate_status in (401, 404):
                        continue

                    response = candidate_response
                    result = candidate_result
                    break
                except Exception as request_exc:
                    last_error = str(request_exc)

            if response is not None:
                break

        if response is not None:
            return {
                "success": False,
                "status_code": int(response.status_code),
                "error": str(result.get("message") or result.get("error") or last_error or "Erro no Evolution"),
            }

        return {
            "success": False,
            "status_code": int(last_status_code or 500),
            "error": last_error or "Falha ao enviar mensagem no Evolution",
        }

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
            
            onboarding_url = MarketingLeadsService.build_lead_onboarding_url(lead_id)

            # Mensagem de warmup
            message = f"""Oi {first_name}! 🚀

Recebemos seu interesse em AgendaFácil!

Clique aqui pra criar sua barbearia em 3 passos:
{onboarding_url}

Quer saber como começar? Estamos aqui pra ajudar! 💬"""
            
            send_result = MarketingLeadsService._send_text_via_evolution(
                config=config,
                phone_e164=phone_e164,
                message=message,
            )
            
            # Se bem-sucedido, atualizar apenas dados de negócio.
            # O controle de status/tentativas de dispatch é feito no worker.
            if send_result.get("success"):
                MarketingLeadsRepository.update(lead_id, {
                    "whatsapp_sent_at": datetime.utcnow().isoformat(),
                    "validation_status": "VALID",
                    "status": "ONBOARDING",
                })
                
                return {
                    "success": True,
                    "lead_id": lead_id,
                    "provider_response": send_result.get("provider_response") or {}
                }
            
            # Se erro, marcar como inválido se 404 ou erro do número
            if not send_result.get("success"):
                error_msg = str(send_result.get("error") or "Erro no Evolution")
                status_code = int(send_result.get("status_code") or 500)
                
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
                    "status_code": status_code
                }
            
        except Exception as exc:
            return {
                "success": False,
                "lead_id": lead_id,
                "error": str(exc)
            }

    @staticmethod
    def enqueue_warmup_dispatch(lead_id: str) -> None:
        """Enfileirar dispatch SOMENTE se ainda não foi enviado com sucesso."""
        try:
            lead = MarketingLeadsRepository.get_by_id(lead_id)
            if not lead:
                return None
            current_status = str(lead.get("whatsapp_dispatch_status") or "").strip().upper()
            # Se já foi enviado com sucesso, NÃO re-enfileirar
            if current_status == "SENT":
                return None
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

            # Skip leads já enviados com sucesso
            status = str(lead.get("whatsapp_dispatch_status") or "PENDING").strip()
            if status == "SENT":
                continue

            name = str(lead.get("name") or "").strip()
            whatsapp = str(lead.get("whatsapp") or "").strip()
            attempts = int(lead.get("whatsapp_dispatch_attempts") or 0)

            # Re-buscar status atual do BD para garantir idempotência.
            # Outro processo pode ter enviado enquanto aguardávamos.
            fresh = MarketingLeadsRepository.get_by_id(lead_id)
            if fresh and str(fresh.get("whatsapp_dispatch_status") or "").strip().upper() == "SENT":
                continue

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
            
            phone_e164 = MarketingLeadsService._to_e164(whatsapp)
            onboarding_url = MarketingLeadsService.build_lead_onboarding_url(lead_id)
            message = f"""Oi {first_name}! 👋

Ficou com dúvida? Estamos aqui pra ajudar!

Retome sua agenda: {onboarding_url}

Qualquer dúvida, é só chamar! 💬"""

            send_result = MarketingLeadsService._send_text_via_evolution(
                config=config,
                phone_e164=phone_e164,
                message=message,
            )
            return {"success": bool(send_result.get("success")), "error": send_result.get("error")}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    @staticmethod
    def send_reengagement_d3(lead_id: str, name: str, whatsapp: str, barbeiro_exemplo: str = "João") -> dict:
        """Enviar mensagem de reengajamento D3 (72h depois)"""
        first_name = (name or "").split()[0] if name else "Barbeiro"
        
        try:
            config = MarketingLeadsService._get_evolution_config()
            
            phone_e164 = MarketingLeadsService._to_e164(whatsapp)
            onboarding_url = MarketingLeadsService.build_lead_onboarding_url(lead_id)
            message = f"""Oi {first_name}! 📱

Veja como {barbeiro_exemplo} tá ganhando mais com AgendaFácil:
✅ Agendas automáticas
✅ Sem no-shows
✅ Mais faturamento

Quer fazer o mesmo? 👇
{onboarding_url}"""

            send_result = MarketingLeadsService._send_text_via_evolution(
                config=config,
                phone_e164=phone_e164,
                message=message,
            )
            return {"success": bool(send_result.get("success")), "error": send_result.get("error")}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    @staticmethod
    def send_reengagement_d7(lead_id: str, name: str, whatsapp: str) -> dict:
        """Enviar mensagem de reengajamento D7 (1 semana depois)"""
        first_name = (name or "").split()[0] if name else "Barbeiro"
        
        try:
            config = MarketingLeadsService._get_evolution_config()
            
            phone_e164 = MarketingLeadsService._to_e164(whatsapp)
            onboarding_url = MarketingLeadsService.build_lead_onboarding_url(lead_id)
            message = f"""Oi {first_name}! ⏰

Sua agenda FREE tá pronta e funcionando!

Quer desbloquear:
🔓 Agendamentos ilimitados
🔓 Cobranças automáticas
🔓 Relatórios pro

Por apenas R$29/mês (primeiros 3 meses -30%)

Ativa agora? 👇
{onboarding_url}"""

            send_result = MarketingLeadsService._send_text_via_evolution(
                config=config,
                phone_e164=phone_e164,
                message=message,
            )

            if send_result.get("success"):
                # Se passou de D7 sem converter, marcar como COLD_LEAD
                MarketingLeadsRepository.update(lead_id, {
                    "status": "COLD"
                })
            
            return {"success": bool(send_result.get("success")), "error": send_result.get("error")}
        except Exception as exc:
            return {"success": False, "error": str(exc)}
