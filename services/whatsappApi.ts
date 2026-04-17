import { apiRequest } from './apiClient';

export type WhatsAppIntegrationStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'QR_READY'
  | 'AWAITING_CONNECTION'
  | 'CONNECTED'
  | 'ERROR';

export type CreateEvolutionInstancePayload = {
  instance_name?: string;
};

export type CreateEvolutionInstanceResult = {
  instance_name: string;
  qr_code?: string | null;
  provider_response?: Record<string, unknown>;
  provider_config_id?: string | null;
  integration_status?: WhatsAppIntegrationStatus;
  last_sync_at?: string | null;
};

export type EvolutionIntegrationStateResult = {
  has_integration: boolean;
  instance_name?: string | null;
  is_connected: boolean;
  connection_status?: string | null;
  integration_status?: WhatsAppIntegrationStatus | null;
  last_sync_at?: string | null;
  last_error?: string | null;
};

export type DisconnectEvolutionInstanceResult = {
  disconnected: boolean;
  instance_name?: string | null;
  provider_response?: Record<string, unknown> | null;
  provider_config_id?: string | null;
  message?: string;
};

export async function createEvolutionInstanceApi(payload: CreateEvolutionInstancePayload = {}) {
  return apiRequest<CreateEvolutionInstanceResult>('/internal/notifications/whatsapp/evolution/instance', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getEvolutionIntegrationStateApi() {
  return apiRequest<EvolutionIntegrationStateResult>('/internal/notifications/whatsapp/evolution/state', {
    method: 'GET',
  });
}

export async function disconnectEvolutionInstanceApi() {
  return apiRequest<DisconnectEvolutionInstanceResult>('/internal/notifications/whatsapp/evolution/disconnect', {
    method: 'POST',
  });
}
