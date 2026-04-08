import { apiRequest } from './apiClient';

export type ClienteApi = {
  id: string;
  barbearia_id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  data_nascimento?: string | null;
  cortes_count?: number | null;
  total_gasto?: number | null;
  ultima_visita?: string | null;
};

export type ClientePayload = {
  nome: string;
  telefone: string;
  email?: string | null;
  data_nascimento?: string | null;
};

export type ClienteLookupResult = {
  exists: boolean;
  cliente: ClienteApi | null;
};

export type AssinaturaClientePlanoServicoApi = {
  id?: string;
  plano_id?: string;
  servico_id: string;
  servico_nome?: string;
  quantidade_mensal: number;
};

export type AssinaturaClientePlanoApi = {
  id: string;
  barbearia_id: string;
  nome: string;
  descricao?: string | null;
  valor_mensal_centavos: number;
  dias_carencia: number;
  ativo: boolean;
  clientes_ativos_count?: number;
  servicos: AssinaturaClientePlanoServicoApi[];
};

export type AssinaturaClienteResumoApi = {
  subscription: {
    id: string;
    status: 'ACTIVE' | 'GRACE' | 'PAST_DUE' | 'PAUSED' | 'CANCELLED' | string;
    current_cycle_start: string;
    current_cycle_end: string;
    next_due_at?: string;
    grace_until?: string | null;
    plano_id: string;
  };
  plano: AssinaturaClientePlanoApi;
  beneficios: Array<{
    servico_id: string;
    servico_nome?: string;
    quantidade_incluida: number;
    quantidade_consumida: number;
    quantidade_restante: number;
  }>;
};

export type AssinaturaClientePagamentoApi = {
  id: string;
  subscription_id: string;
  cycle_start: string;
  cycle_end: string;
  amount_centavos: number;
  paid_at: string;
  metodo: string;
  observacao?: string | null;
};

export type ClienteComAssinaturaApi = {
  cliente_id: string;
  cliente_nome: string;
  cliente_telefone?: string | null;
  assinatura_id: string;
  status: string;
  current_cycle_start: string;
  current_cycle_end: string;
  next_due_at?: string | null;
  plano_id: string;
  plano_nome: string;
  franquia_incluida_total?: number;
  franquia_consumida_total?: number;
  franquia_utilizacao_percent?: number;
};

export async function listClientesApi() {
  return apiRequest<ClienteApi[]>('/clientes', {
    method: 'GET',
  });
}

export async function createClienteApi(payload: ClientePayload) {
  return apiRequest<ClienteApi>('/clientes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateClienteApi(clienteId: string, payload: ClientePayload) {
  return apiRequest<ClienteApi>(`/clientes/${clienteId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteClienteApi(clienteId: string) {
  return apiRequest<{ id: string }>(`/clientes/${clienteId}`, {
    method: 'DELETE',
  });
}

export async function findClienteByPhonePublicApi(telefone: string) {
  const query = new URLSearchParams({ telefone });
  return apiRequest<ClienteLookupResult>(`/clientes/publico/por-telefone?${query.toString()}`, {
    method: 'GET',
  });
}

export async function createClientePublicApi(payload: ClientePayload) {
  return apiRequest<ClienteApi>('/clientes/publico', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listPlanosAssinaturaClienteApi() {
  return apiRequest<AssinaturaClientePlanoApi[]>('/clientes/assinaturas/planos', {
    method: 'GET',
  });
}

export async function listClientesComAssinaturaApi() {
  return apiRequest<ClienteComAssinaturaApi[]>('/clientes/assinaturas/clientes', {
    method: 'GET',
  });
}

export async function createPlanoAssinaturaClienteApi(payload: {
  nome: string;
  descricao?: string | null;
  valor_mensal_centavos: number;
  dias_carencia: number;
  servicos: Array<{ servico_id: string; quantidade_mensal: number }>;
}) {
  return apiRequest<AssinaturaClientePlanoApi>('/clientes/assinaturas/planos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePlanoAssinaturaClienteApi(
  planoId: string,
  payload: {
    nome: string;
    descricao?: string | null;
    valor_mensal_centavos: number;
    dias_carencia: number;
    ativo: boolean;
    servicos: Array<{ servico_id: string; quantidade_mensal: number }>;
  }
) {
  return apiRequest<AssinaturaClientePlanoApi>(`/clientes/assinaturas/planos/${planoId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deletePlanoAssinaturaClienteApi(planoId: string) {
  return apiRequest<{ id: string }>(`/clientes/assinaturas/planos/${planoId}`, {
    method: 'DELETE',
  });
}

export async function getAssinaturaClienteApi(clienteId: string) {
  return apiRequest<AssinaturaClienteResumoApi | null>(`/clientes/${clienteId}/assinatura`, {
    method: 'GET',
  });
}

export async function upsertAssinaturaClienteApi(clienteId: string, planoId: string) {
  return apiRequest<AssinaturaClienteResumoApi>(`/clientes/${clienteId}/assinatura`, {
    method: 'PUT',
    body: JSON.stringify({ plano_id: planoId }),
  });
}

export async function cancelAssinaturaClienteApi(clienteId: string, motivo?: string) {
  return apiRequest<{ id: string; status: string }>(`/clientes/${clienteId}/assinatura`, {
    method: 'DELETE',
    body: JSON.stringify({ motivo }),
  });
}

export async function updateStatusAssinaturaClienteApi(
  clienteId: string,
  payload: { status: 'ACTIVE' | 'PAUSED'; motivo?: string }
) {
  return apiRequest<AssinaturaClienteResumoApi>(`/clientes/${clienteId}/assinatura/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function listPagamentosAssinaturaClienteApi(clienteId: string) {
  return apiRequest<AssinaturaClientePagamentoApi[]>(`/clientes/${clienteId}/assinatura/pagamentos`, {
    method: 'GET',
  });
}

export async function createPagamentoAssinaturaClienteApi(
  clienteId: string,
  payload: { metodo: string; amount_centavos?: number; observacao?: string }
) {
  return apiRequest<AssinaturaClientePagamentoApi>(`/clientes/${clienteId}/assinatura/pagamentos`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
