import { apiRequest } from './apiClient';

export type ServicoApi = {
  id: string;
  barbearia_id: string;
  categoria_id?: string | null;
  nome: string;
  duracao_min: number;
  preco: number;
};

export type ServicoPayload = {
  categoria_id?: string | null;
  nome: string;
  duracao_min: number;
  preco: number;
};

export async function listServicosApi() {
  return apiRequest<ServicoApi[]>('/servicos', {
    method: 'GET',
  });
}

export async function createServicoApi(payload: ServicoPayload) {
  return apiRequest<ServicoApi>('/servicos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateServicoApi(servicoId: string, payload: ServicoPayload) {
  return apiRequest<ServicoApi>(`/servicos/${servicoId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteServicoApi(servicoId: string) {
  return apiRequest<{ id: string }>(`/servicos/${servicoId}`, {
    method: 'DELETE',
  });
}
