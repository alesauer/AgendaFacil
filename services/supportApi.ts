import { apiRequest } from './apiClient';

export type SupportContactPayload = {
  contact_name: string;
  message: string;
};

export type SupportContactResult = {
  status: string;
  provider_ref?: string | null;
  idempotency_key: string;
  to: string;
};

export async function sendSupportContactApi(payload: SupportContactPayload) {
  return apiRequest<SupportContactResult>('/internal/notifications/support/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
