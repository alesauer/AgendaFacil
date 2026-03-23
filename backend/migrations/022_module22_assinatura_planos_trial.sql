-- Módulo 22: Assinaturas com ciclo mensal/anual + trial de 7 dias

ALTER TABLE public.barbearias
  ADD COLUMN IF NOT EXISTS ciclo_cobranca TEXT NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS valor_plano_centavos INTEGER NOT NULL DEFAULT 3900,
  ADD COLUMN IF NOT EXISTS trial_usado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_inicio_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS trial_fim_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS assinatura_inicio_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS proxima_cobranca_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS atualizado_assinatura_em TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_barbearias_ciclo_cobranca'
      AND conrelid = 'public.barbearias'::regclass
  ) THEN
    ALTER TABLE public.barbearias
      ADD CONSTRAINT ck_barbearias_ciclo_cobranca
      CHECK (ciclo_cobranca IN ('MONTHLY', 'YEARLY'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_barbearias_valor_plano_centavos'
      AND conrelid = 'public.barbearias'::regclass
  ) THEN
    ALTER TABLE public.barbearias
      ADD CONSTRAINT ck_barbearias_valor_plano_centavos
      CHECK (valor_plano_centavos > 0);
  END IF;
END $$;

-- Backfill conservador baseado no plano legado
UPDATE public.barbearias
SET ciclo_cobranca = 'YEARLY',
    valor_plano_centavos = 29700,
    atualizado_assinatura_em = NOW()
WHERE UPPER(COALESCE(plano, '')) LIKE '%YEAR%'
   OR UPPER(COALESCE(plano, '')) LIKE '%ANUAL%';

UPDATE public.barbearias
SET ciclo_cobranca = 'MONTHLY',
    valor_plano_centavos = 3900,
    atualizado_assinatura_em = NOW()
WHERE NOT (
  UPPER(COALESCE(plano, '')) LIKE '%YEAR%'
  OR UPPER(COALESCE(plano, '')) LIKE '%ANUAL%'
);

CREATE INDEX IF NOT EXISTS idx_barbearias_proxima_cobranca_em
  ON public.barbearias (proxima_cobranca_em);
