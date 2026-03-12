import { apiRequest } from './apiClient';

export type CategoriaApi = {
  id: string;
  barbearia_id: string;
  nome: string;
  descricao?: string | null;
};

export type CategoriaPayload = {
  nome: string;
  descricao?: string | null;
};

export async function listCategoriasApi() {
  return apiRequest<CategoriaApi[]>('/categorias', {
    method: 'GET',
  });
}

export async function createCategoriaApi(payload: CategoriaPayload) {
  return apiRequest<CategoriaApi>('/categorias', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCategoriaApi(categoriaId: string, payload: CategoriaPayload) {
  return apiRequest<CategoriaApi>(`/categorias/${categoriaId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCategoriaApi(categoriaId: string) {
  return apiRequest<{ id: string }>(`/categorias/${categoriaId}`, {
    method: 'DELETE',
  });
}
