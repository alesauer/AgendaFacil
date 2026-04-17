import { apiRequest } from './apiClient';

export type ServicoApi = {
  id: string;
  barbearia_id: string;
  categoria_id?: string | null;
  nome: string;
  duracao_min: number;
  preco: number;
  sort_order?: number;
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

export async function listServicosPublicApi() {
  return apiRequest<ServicoApi[]>('/servicos/publico', {
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

export async function reorderServicosApi(serviceIds: string[]) {
  return apiRequest<ServicoApi[]>('/servicos/ordem', {
    method: 'PUT',
    body: JSON.stringify({ service_ids: serviceIds }),
  });
}
