import { apiRequest } from './apiClient';

export type IdentidadeApi = {
  id: string;
  nome: string;
  slug: string;
  telefone?: string | null;
  cidade?: string | null;
  logo_url?: string | null;
  login_logo_url?: string | null;
  login_background_url?: string | null;
  icone_marca?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
};

export type IdentidadePayload = {
  nome: string;
  logo_url?: string | null;
  login_logo_url?: string | null;
  login_background_url?: string | null;
  icone_marca?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
};

export async function getIdentidadeApi() {
  return apiRequest<IdentidadeApi>('/barbearia/identidade', {
    method: 'GET',
  });
}

export async function getIdentidadePublicaApi() {
  return apiRequest<Pick<IdentidadeApi, 'nome' | 'logo_url' | 'login_logo_url' | 'login_background_url' | 'icone_marca' | 'cor_primaria' | 'cor_secundaria'>>('/barbearia/identidade-publica', {
    method: 'GET',
  });
}

export async function saveIdentidadeApi(payload: IdentidadePayload) {
  return apiRequest<IdentidadeApi>('/barbearia/identidade', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
