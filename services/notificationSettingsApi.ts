import { apiRequest } from './apiClient';

export type NotificationChannelSettingsResult = {
  whatsapp_enabled: boolean;
  email_enabled: boolean;
};

export type NotificationChannelSettingsPayload = {
  whatsapp_enabled?: boolean;
  email_enabled?: boolean;
};

export async function getNotificationChannelSettingsApi() {
  return apiRequest<NotificationChannelSettingsResult>('/internal/notifications/channels/settings', {
    method: 'GET',
  });
}

export async function saveNotificationChannelSettingsApi(payload: NotificationChannelSettingsPayload) {
  return apiRequest<NotificationChannelSettingsResult>('/internal/notifications/channels/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
