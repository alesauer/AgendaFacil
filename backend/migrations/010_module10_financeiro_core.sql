-- Módulo 10: Financeiro Sprint 1
-- Escopo: recebíveis, pagamentos e livro-caixa (sem NFe, MDR/liquidação, AP e conciliação)

CREATE TABLE IF NOT EXISTS public.financial_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  origem TEXT NOT NULL DEFAULT 'AGENDAMENTO',
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED')),
  valor_bruto NUMERIC(10,2) NOT NULL CHECK (valor_bruto >= 0),
  valor_recebido NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_recebido >= 0),
  valor_estornado NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_estornado >= 0),
  vencimento DATE,
  competencia TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_receivable_agendamento
  ON public.financial_receivables (barbearia_id, agendamento_id)
  WHERE agendamento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_receivables_barbearia_status
  ON public.financial_receivables (barbearia_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_receivables_barbearia_competencia
  ON public.financial_receivables (barbearia_id, competencia);

CREATE TABLE IF NOT EXISTS public.financial_receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
  receivable_id UUID NOT NULL REFERENCES public.financial_receivables(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  metodo_pagamento TEXT NOT NULL,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  motivo TEXT,
  is_estorno BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID,
  created_by_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_payments_receivable
  ON public.financial_receivable_payments (receivable_id, recebido_em DESC);

CREATE INDEX IF NOT EXISTS idx_financial_payments_barbearia
  ON public.financial_receivable_payments (barbearia_id, recebido_em DESC);

CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('INCOME', 'REFUND')),
  origem_tipo TEXT NOT NULL CHECK (origem_tipo IN ('RECEIVABLE_PAYMENT', 'MANUAL_ADJUSTMENT')),
  origem_id UUID,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_entries_barbearia_ocorrido
  ON public.financial_entries (barbearia_id, ocorrido_em DESC);

CREATE INDEX IF NOT EXISTS idx_financial_entries_origem
  ON public.financial_entries (origem_tipo, origem_id);
