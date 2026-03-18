-- Módulo 12: Comissão de profissionais
-- Adiciona percentual de comissão por profissional (0 a 100)

ALTER TABLE public.profissionais
ADD COLUMN IF NOT EXISTS comissao_percentual NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.profissionais
DROP CONSTRAINT IF EXISTS ck_profissionais_comissao_percentual;

ALTER TABLE public.profissionais
ADD CONSTRAINT ck_profissionais_comissao_percentual
CHECK (comissao_percentual >= 0 AND comissao_percentual <= 100);

UPDATE public.profissionais
SET comissao_percentual = 0
WHERE comissao_percentual IS NULL;
