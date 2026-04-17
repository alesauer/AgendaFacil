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
  churn_risk_days_threshold?: number | null;
  allow_employee_confirm_appointment?: boolean | null;
  allow_employee_create_appointment?: boolean | null;
  allow_employee_view_finance?: boolean | null;
  allow_employee_view_reports?: boolean | null;
  allow_employee_view_users?: boolean | null;
  icone_marca?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
};

export type IdentidadePayload = {
  nome: string;
  telefone?: string | null;
  cidade?: string | null;
  logo_url?: string | null;
  login_logo_url?: string | null;
  login_background_url?: string | null;
  churn_risk_days_threshold?: number;
  allow_employee_confirm_appointment?: boolean;
  allow_employee_create_appointment?: boolean;
  allow_employee_view_finance?: boolean;
  allow_employee_view_reports?: boolean;
  allow_employee_view_users?: boolean;
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
  return apiRequest<Pick<IdentidadeApi, 'nome' | 'logo_url' | 'login_logo_url' | 'login_background_url' | 'churn_risk_days_threshold' | 'allow_employee_confirm_appointment' | 'allow_employee_create_appointment' | 'allow_employee_view_finance' | 'allow_employee_view_reports' | 'allow_employee_view_users' | 'icone_marca' | 'cor_primaria' | 'cor_secundaria'>>('/barbearia/identidade-publica', {
    method: 'GET',
  });
}

export async function saveIdentidadeApi(payload: IdentidadePayload) {
  return apiRequest<IdentidadeApi>('/barbearia/identidade', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
