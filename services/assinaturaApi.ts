import { apiRequest } from './apiClient';

export type AssinaturaPlanoApi = {
  codigo: 'MENSAL_39' | 'ANUAL_297' | string;
  ciclo_cobranca: 'MONTHLY' | 'YEARLY' | string;
  titulo: string;
  valor_centavos: number;
  descricao?: string;
  link_pagamento?: string | null;
};

export type AssinaturaApi = {
  plano: string;
  assinatura_status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED' | string;
  assinatura_status_efetivo?: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED' | string;
  ciclo_cobranca: 'MONTHLY' | 'YEARLY' | string;
  valor_plano_centavos: number;
  trial_usado?: boolean;
  trial_inicio_em?: string | null;
  trial_fim_em?: string | null;
  dias_restantes_trial?: number;
  assinatura_inicio_em?: string | null;
  proxima_cobranca_em?: string | null;
  atualizado_assinatura_em?: string | null;
  planos_disponiveis?: AssinaturaPlanoApi[];
  trial?: {
    dias: number;
    habilitado: boolean;
  };
};

export async function getAssinaturaApi() {
  return apiRequest<AssinaturaApi>('/barbearia/assinatura', {
    method: 'GET',
  });
}

export async function saveAssinaturaApi(payload: { ciclo_cobranca: 'MONTHLY' | 'YEARLY'; iniciar_trial?: boolean }) {
  return apiRequest<AssinaturaApi>('/barbearia/assinatura', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
