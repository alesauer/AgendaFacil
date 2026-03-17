import { apiRequest } from './apiClient';

export type ClienteApi = {
  id: string;
  barbearia_id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  data_nascimento?: string | null;
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
