-- Módulo 21: Campos SaaS para painel MASTER

ALTER TABLE public.barbearias
  ADD COLUMN IF NOT EXISTS plano TEXT NOT NULL DEFAULT 'BASIC',
  ADD COLUMN IF NOT EXISTS assinatura_status TEXT NOT NULL DEFAULT 'ACTIVE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_barbearias_assinatura_status'
      AND conrelid = 'public.barbearias'::regclass
  ) THEN
    ALTER TABLE public.barbearias
      ADD CONSTRAINT ck_barbearias_assinatura_status
      CHECK (assinatura_status IN ('ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'SUSPENDED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_barbearias_assinatura_status
  ON public.barbearias (assinatura_status);
