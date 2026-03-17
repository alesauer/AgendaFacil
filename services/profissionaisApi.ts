import { apiRequest } from './apiClient';

export type ProfissionalApi = {
  id: string;
  barbearia_id: string;
  nome: string;
  cargo?: string | null;
  telefone?: string | null;
  foto_url?: string | null;
  ativo: boolean;
};

export type ProfissionalPayload = {
  id?: string;
  nome: string;
  cargo?: string;
  telefone?: string;
  foto_url?: string | null;
  ativo?: boolean;
};

export async function listProfissionaisApi() {
  return apiRequest<ProfissionalApi[]>('/profissionais', {
    method: 'GET',
  });
}

export async function listProfissionaisPublicApi() {
  return apiRequest<ProfissionalApi[]>('/profissionais/publico', {
    method: 'GET',
  });
}

export async function createProfissionalApi(payload: ProfissionalPayload) {
  return apiRequest<ProfissionalApi>('/profissionais', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProfissionalApi(profissionalId: string, payload: ProfissionalPayload) {
  return apiRequest<ProfissionalApi>(`/profissionais/${profissionalId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProfissionalApi(profissionalId: string) {
  return apiRequest<{ id: string }>(`/profissionais/${profissionalId}`, {
    method: 'DELETE',
  });
}
