from __future__ import annotations

from backend.notifications.adapters import EvolutionWhatsAppAdapter, ResendEmailAdapter
from backend.notifications.models import Channel
from backend.notifications.ports import NotificationProviderPort
from backend.repositories.notifications_repository import NotificationsRepository


class ProviderResolver:
    def __init__(self):
        self.registry: dict[str, NotificationProviderPort] = {
            "EVOLUTION": EvolutionWhatsAppAdapter(),
            "RESEND": ResendEmailAdapter(),
        }

    def resolve(self, barbearia_id: str, channel: Channel) -> NotificationProviderPort:
        config = NotificationsRepository.get_active_provider_config(barbearia_id, channel.value)
        default_provider = "EVOLUTION" if channel == Channel.WHATSAPP else "RESEND"
        provider_name = str((config or {}).get("provider_name") or default_provider).upper()

        provider = self.registry.get(provider_name)
        if not provider:
            raise RuntimeError(f"Provider não registrado: {provider_name}")

        if not provider.supports(channel):
            raise RuntimeError(f"Provider {provider_name} não suporta canal {channel.value}")

        return provider
