import { apiRequest } from './apiClient';

export type MasterGlobalSetting = {
  key: string;
  category: 'proxy' | 'email' | 'whatsapp' | 'payments' | string;
  env_key: string;
  data_type: 'string' | 'number' | 'boolean' | 'json' | string;
  is_secret: boolean;
  requires_restart: boolean;
  description: string;
  value: string | null;
  value_masked: string | null;
  current_value_masked: string | null;
  pending_value_masked: string | null;
  has_pending: boolean;
  source: 'pending' | 'stored' | 'env' | string;
  updated_by?: string | null;
  updated_at?: string | null;
};

export type MasterGlobalSettingsPayload = {
  version: number;
  items: MasterGlobalSetting[];
};

export type MasterGlobalRelease = {
  version: number;
  action: 'publish' | 'rollback' | string;
  notes?: string | null;
  created_by: string;
  created_at: string;
};

export type PublishResult = {
  version: number;
  published: number;
  changed_keys: string[];
  requires_restart: string[];
  message: string;
};

export async function listMasterGlobalSettingsApi() {
  return apiRequest<MasterGlobalSettingsPayload>('/master/settings', { method: 'GET' });
}

export async function updateMasterGlobalSettingApi(settingKey: string, value: string | boolean | number | null) {
  return apiRequest<{ key: string; category: string; value_masked: string | null; has_pending: boolean }>(`/master/settings/${settingKey}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export async function testMasterGlobalSettingsApi(category: string, usePending = true) {
  return apiRequest<{ ok: boolean; message: string; details?: Record<string, unknown> }>('/master/settings/test', {
    method: 'POST',
    body: JSON.stringify({ category, use_pending: usePending }),
  });
}

export async function publishMasterGlobalSettingsApi(notes?: string) {
  return apiRequest<PublishResult>('/master/settings/publish', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function listMasterGlobalReleasesApi(limit = 20) {
  return apiRequest<MasterGlobalRelease[]>(`/master/settings/releases?limit=${limit}`, { method: 'GET' });
}

export async function rollbackMasterGlobalSettingsApi(version: number, notes?: string) {
  return apiRequest<{ version: number; rollback_from: number; message: string }>(`/master/settings/rollback/${version}`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}
