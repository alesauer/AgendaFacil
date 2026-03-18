import { apiRequest } from './apiClient';

export type DashboardClienteFrequenteApi = {
  cliente_id: string;
  cliente_nome: string;
  total_agendamentos: number;
  ultima_visita?: string | null;
};

export type DashboardClienteFaturamentoApi = {
  cliente_id: string;
  cliente_nome: string;
  total_faturado: number;
  total_agendamentos: number;
  ultima_visita?: string | null;
};

export type DashboardClienteChurnApi = {
  cliente_id: string;
  cliente_nome: string;
  ultima_visita?: string | null;
  dias_sem_retorno: number;
};

export type DashboardInsightsApi = {
  top_clientes_frequentes: DashboardClienteFrequenteApi[];
  top_clientes_faturamento: DashboardClienteFaturamentoApi[];
  clientes_risco_churn: DashboardClienteChurnApi[];
};

export async function getDashboardInsightsApi() {
  return apiRequest<DashboardInsightsApi>('/dashboard/insights', {
    method: 'GET',
  });
}
