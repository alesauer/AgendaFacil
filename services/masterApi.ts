import { apiRequest } from './apiClient';

export type MasterTenantRow = {
  id: string;
  nome: string;
  slug: string;
  telefone?: string | null;
  cidade?: string | null;
  plano?: string | null;
  assinatura_status?: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED' | string | null;
  ciclo_cobranca?: 'MONTHLY' | 'YEARLY' | string | null;
  valor_plano_centavos?: number | null;
  assinatura_inicio_em?: string | null;
  proxima_cobranca_em?: string | null;
  payment_last_event_type?: string | null;
  payment_webhook_updated_at?: string | null;
  payment_provider?: string | null;
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
  tenants_trial: number;
  tenants_inadimplentes: number;
  tenants_canceladas: number;
  vencendo_7d: number;
  mrr_estimado: number;
  pagamentos_ok_7d: number;
  falhas_7d: number;
  sem_webhook_recente_24h: number;
  clientes_30d: number;
  agendamentos_30d: number;
  mensagens_30d: number;
  receita_30d: number;
};

export type MasterProvisionPayload = {
  tenant_nome: string;
  tenant_slug: string;
  tenant_telefone?: string;
  tenant_cidade?: string;
  admin_nome: string;
  admin_telefone: string;
  admin_email?: string;
  admin_senha: string;
};

export type MasterCheckinSearchRow = {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  profissional_nome?: string;
  servico_nome?: string;
};

export type MasterTenantUpdatePayload = {
  nome: string;
  slug: string;
  telefone?: string;
  cidade?: string;
};

export type MasterImpersonationResult = {
  token: string;
  tenant: {
    id: string;
    nome: string;
    slug: string;
  };
  user: {
    id: string;
    barbearia_id: string;
    nome: string;
    telefone: string;
    email?: string | null;
    role: 'ADMIN';
    ativo: boolean;
  };
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

export async function provisionMasterTenantApi(payload: MasterProvisionPayload) {
  return apiRequest<{ tenant: any; admin: any }>(`/master/lab/provision`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function searchMasterCheckinApi(params: { tenant_slug: string; date: string; phone: string }) {
  const query = new URLSearchParams({
    tenant_slug: params.tenant_slug,
    date: params.date,
    phone: params.phone,
  });
  return apiRequest<{ rows: MasterCheckinSearchRow[] }>(`/master/lab/checkin/search?${query.toString()}`, {
    method: 'GET',
  });
}

export async function performMasterCheckinApi(agendamentoId: string, payload: { tenant_slug: string }) {
  return apiRequest<{ already_checked_in: boolean; agendamento: any }>(`/master/lab/checkin/${agendamentoId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMasterTenantApi(tenantId: string, payload: MasterTenantUpdatePayload) {
  return apiRequest<MasterTenantRow>(`/master/tenants/${tenantId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function setMasterTenantBlockedApi(tenantId: string, blocked: boolean) {
  return apiRequest<MasterTenantRow>(`/master/tenants/${tenantId}/block`, {
    method: 'PATCH',
    body: JSON.stringify({ blocked }),
  });
}

export async function impersonateMasterTenantApi(tenantId: string, reason?: string) {
  return apiRequest<MasterImpersonationResult>(`/master/tenants/${tenantId}/impersonate`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Suporte MASTER' }),
  });
}

export async function deleteMasterTenantApi(tenantId: string) {
  return apiRequest<MasterTenantRow>(`/master/tenants/${tenantId}`, {
    method: 'DELETE',
  });
}
