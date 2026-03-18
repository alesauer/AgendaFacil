import { apiRequest } from './apiClient';

export type FinanceiroResumoApi = {
  total_recebiveis: number;
  a_receber: number;
  recebido_bruto: number;
  estornado: number;
  recebido_liquido: number;
  quitado: number;
};

export type RecebivelApi = {
  id: string;
  barbearia_id: string;
  agendamento_id?: string | null;
  origem: string;
  descricao: string;
  status: 'OPEN' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'CANCELLED';
  valor_bruto: number;
  valor_recebido: number;
  valor_estornado: number;
  vencimento?: string | null;
  competencia?: string | null;
  observacao?: string | null;
  created_at: string;
  updated_at: string;
  cliente_nome?: string | null;
  servico_nome?: string | null;
  profissional_nome?: string | null;
  agendamento_data?: string | null;
  agendamento_hora_inicio?: string | null;
};

export type RecebivelPagamentoApi = {
  payment: {
    id: string;
    barbearia_id: string;
    receivable_id: string;
    agendamento_id?: string | null;
    valor: number;
    metodo_pagamento: string;
    recebido_em: string;
    motivo?: string | null;
    is_estorno: boolean;
  };
  receivable: RecebivelApi;
};

export type RegistrarPagamentoPayload = {
  valor: number;
  metodo_pagamento: string;
  recebido_em?: string;
  motivo?: string;
};

export type RegistrarEstornoPayload = {
  valor: number;
  motivo: string;
  recebido_em?: string;
};

export async function getFinanceiroResumoApi() {
  return apiRequest<FinanceiroResumoApi>('/financeiro/resumo', {
    method: 'GET',
  });
}

export async function listRecebiveisApi(params?: { status?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (typeof params?.limit === 'number') query.set('limit', String(params.limit));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<RecebivelApi[]>(`/financeiro/recebiveis${suffix}`, {
    method: 'GET',
  });
}

export async function registrarPagamentoRecebivelApi(recebivelId: string, payload: RegistrarPagamentoPayload) {
  return apiRequest<RecebivelPagamentoApi>(`/financeiro/recebiveis/${recebivelId}/pagamentos`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registrarEstornoRecebivelApi(recebivelId: string, payload: RegistrarEstornoPayload) {
  return apiRequest<RecebivelPagamentoApi>(`/financeiro/recebiveis/${recebivelId}/estorno`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
