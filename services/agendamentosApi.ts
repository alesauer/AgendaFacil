import { apiRequest } from './apiClient';

export type AgendamentoApi = {
  id: string;
  barbearia_id: string;
  cliente_id: string;
  profissional_id: string;
  servico_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  valor_final?: number | null;
  forma_pagamento?: string | null;
  pago_em?: string | null;
  desconto?: number | null;
  cortesia?: boolean;
  estornado?: boolean;
  concluido_operacional_em?: string | null;
  concluido_financeiro_em?: string | null;
  block_reason?: string | null;
  is_bloqueio?: boolean;
};

export type AgendamentoPayload = {
  cliente_id: string;
  profissional_id: string;
  servico_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status?: string;
};

export type AgendamentoPublicActionPayload = {
  cliente_id: string;
  motivo?: string;
};

export type AgendamentoPublicReschedulePayload = {
  cliente_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
};

export type AgendamentoStatusPayload = {
  status: string;
  motivo?: string;
  observacao?: string;
  forma_pagamento?: string;
  valor_final?: number;
};

export type BloqueioPayload = {
  profissional_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  motivo?: string | null;
};

export type DisponibilidadeSlotApi = {
  hora_inicio: string;
  hora_fim: string;
};

export async function listAgendamentosApi() {
  return apiRequest<AgendamentoApi[]>('/agendamentos', {
    method: 'GET',
  });
}

export async function listAgendamentosPublicByClientApi(clienteId: string) {
  const query = new URLSearchParams({ cliente_id: clienteId });
  return apiRequest<AgendamentoApi[]>(`/agendamentos/publico?${query.toString()}`, {
    method: 'GET',
  });
}

export async function createAgendamentoApi(payload: AgendamentoPayload) {
  return apiRequest<AgendamentoApi>('/agendamentos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createAgendamentoPublicApi(payload: AgendamentoPayload) {
  return apiRequest<AgendamentoApi>('/agendamentos/publico', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listDisponibilidadePublicApi(params: {
  profissional_id: string;
  data: string;
  duracao_min: number;
}) {
  const query = new URLSearchParams({
    profissional_id: params.profissional_id,
    data: params.data,
    duracao_min: String(params.duracao_min),
  });

  return apiRequest<DisponibilidadeSlotApi[]>(`/agenda/disponibilidade/publico?${query.toString()}`, {
    method: 'GET',
  });
}

export async function updateAgendamentoApi(agendamentoId: string, payload: AgendamentoPayload) {
  return apiRequest<AgendamentoApi>(`/agendamentos/${agendamentoId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateAgendamentoPublicApi(agendamentoId: string, payload: AgendamentoPublicReschedulePayload) {
  return apiRequest<AgendamentoApi>(`/agendamentos/publico/${agendamentoId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAgendamentoApi(agendamentoId: string) {
  return apiRequest<{ id: string }>(`/agendamentos/${agendamentoId}`, {
    method: 'DELETE',
  });
}

export async function transitionAgendamentoStatusApi(agendamentoId: string, payload: AgendamentoStatusPayload) {
  return apiRequest<AgendamentoApi>(`/agendamentos/${agendamentoId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function cancelAgendamentoPublicApi(agendamentoId: string, payload: AgendamentoPublicActionPayload) {
  return apiRequest<AgendamentoApi>(`/agendamentos/publico/${agendamentoId}/cancelar`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function createBloqueioApi(payload: BloqueioPayload) {
  return apiRequest<AgendamentoApi>('/agenda/bloqueios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBloqueioApi(bloqueioId: string, payload: BloqueioPayload) {
  return apiRequest<AgendamentoApi>(`/agenda/bloqueios/${bloqueioId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBloqueioApi(bloqueioId: string) {
  return apiRequest<{ id: string }>(`/agenda/bloqueios/${bloqueioId}`, {
    method: 'DELETE',
  });
}
