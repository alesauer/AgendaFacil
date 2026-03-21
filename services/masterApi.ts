import { apiRequest } from './apiClient';

export type MasterTenantRow = {
  id: string;
  nome: string;
  slug: string;
  plano: string;
  assinatura_status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED' | string;
  clientes_30d: number;
  agendamentos_30d: number;
  mensagens_30d: number;
  receita_30d: number;
  ultimo_acesso?: string | null;
  created_at?: string;
};

export type MasterOverview = {
  total_tenants: number;
  tenants_ativos: number;
  clientes_30d: number;
  agendamentos_30d: number;
  mensagens_30d: number;
  receita_30d: number;
};

export async function getMasterOverviewApi(params?: { search?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<MasterOverview>(`/master/overview${suffix}`, { method: 'GET' });
}

export async function listMasterTenantsApi(params?: { search?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<MasterTenantRow[]>(`/master/tenants${suffix}`, { method: 'GET' });
}
