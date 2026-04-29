import { apiRequest } from './apiClient';

export type AssinaturaPlanoApi = {
  codigo: 'MENSAL_39' | 'ANUAL_297' | string;
  plano_tier?: 'ESSENCIAL' | 'PROFISSIONAL' | 'AVANCADO' | string;
  ciclo_cobranca: 'MONTHLY' | 'YEARLY' | string;
  titulo: string;
  valor_centavos: number;
  descricao?: string;
  checkout_url?: string | null;
};

export type AssinaturaApi = {
  plano: string;
  assinatura_status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED' | string;
  assinatura_status_efetivo?: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED' | string;
  ciclo_cobranca: 'MONTHLY' | 'YEARLY' | string;
  valor_plano_centavos: number;
  payment_provider?: string;
  pagamentos_recentes?: Array<{
    id: string;
    status: string;
    billing_type?: string;
    valor_centavos: number;
    vencimento_em?: string | null;
    pago_em?: string | null;
    invoice_url?: string | null;
    boleto_url?: string | null;
    installment_id?: string | null;
    installment_number?: number;
  }>;
  resumo_pagamentos?: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
  utilization_metrics?: {
    consumo_plano?: {
      tier?: string;
      clientes_cadastrados?: number;
      limite_clientes?: number | null;
      percentual?: number | null;
    };
    agendamentos_mes?: number;
    atendimentos_concluidos_mes?: number;
    faturamento_mes_centavos?: number;
    custo_por_atendimento_centavos?: number | null;
    ticket_medio_centavos?: number | null;
    taxa_ocupacao_percentual?: number;
    horas_ocupadas?: number;
    horas_disponiveis?: number;
  };
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

export async function createCheckoutApi(payload: {
  ciclo_cobranca: 'MONTHLY' | 'YEARLY';
  plano_tier?: 'ESSENCIAL' | 'PROFISSIONAL' | 'AVANCADO';
  email?: string;
  installment_count?: number;
}) {
  return apiRequest<{ init_point: string; preapproval_id?: string | null }>(
    '/barbearia/assinatura/checkout',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}
