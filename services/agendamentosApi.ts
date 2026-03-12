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

export async function listAgendamentosApi() {
  return apiRequest<AgendamentoApi[]>('/agendamentos', {
    method: 'GET',
  });
}

export async function createAgendamentoApi(payload: AgendamentoPayload) {
  return apiRequest<AgendamentoApi>('/agendamentos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAgendamentoApi(agendamentoId: string, payload: AgendamentoPayload) {
  return apiRequest<AgendamentoApi>(`/agendamentos/${agendamentoId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAgendamentoApi(agendamentoId: string) {
  return apiRequest<{ id: string }>(`/agendamentos/${agendamentoId}`, {
    method: 'DELETE',
  });
}
