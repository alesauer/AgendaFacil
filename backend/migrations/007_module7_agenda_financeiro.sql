-- Módulo 7: Evolução de agenda para operação + financeiro
-- Inclui novos status, campos financeiros e auditoria de mudanças de status

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS valor_final NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cortesia BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS estornado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS concluido_operacional_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS concluido_financeiro_em TIMESTAMPTZ;

UPDATE public.agendamentos
SET status = 'COMPLETED_OP',
    concluido_operacional_em = COALESCE(concluido_operacional_em, updated_at, created_at)
WHERE status = 'COMPLETED';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_agendamentos_status'
      AND conrelid = 'public.agendamentos'::regclass
  ) THEN
    ALTER TABLE public.agendamentos DROP CONSTRAINT ck_agendamentos_status;
  END IF;

  ALTER TABLE public.agendamentos
    ADD CONSTRAINT ck_agendamentos_status CHECK (
      status IN (
        'PENDING_PAYMENT',
        'CONFIRMED',
        'IN_PROGRESS',
        'COMPLETED_OP',
        'COMPLETED_FIN',
        'REOPENED',
        'CANCELLED',
        'BLOCKED',
        'COMPLETED'
      )
    );
END $$;

ALTER TABLE public.agendamentos
  DROP CONSTRAINT IF EXISTS ck_agendamentos_horas;

ALTER TABLE public.agendamentos
  ADD CONSTRAINT ck_agendamentos_horas CHECK (hora_fim > hora_inicio),
  ADD CONSTRAINT ck_agendamentos_desconto_non_negative CHECK (desconto >= 0),
  ADD CONSTRAINT ck_agendamentos_valor_final_non_negative CHECK (valor_final IS NULL OR valor_final >= 0);

CREATE TABLE IF NOT EXISTS public.agendamento_status_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  status_anterior TEXT NOT NULL,
  status_novo TEXT NOT NULL,
  motivo TEXT,
  forma_pagamento TEXT,
  valor_final NUMERIC(10,2),
  changed_by_user_id UUID,
  changed_by_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamento_status_audit_barbearia
  ON public.agendamento_status_auditoria (barbearia_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agendamento_status_audit_agendamento
  ON public.agendamento_status_auditoria (agendamento_id, created_at DESC);
