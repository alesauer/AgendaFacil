-- Módulo 27: Ordenação global de serviços
-- Escopo: permitir ordenação manual de serviços no painel administrativo

ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY barbearia_id
      ORDER BY COALESCE(sort_order, 2147483647), created_at, id
    ) AS rn
  FROM public.servicos
)
UPDATE public.servicos s
SET sort_order = ranked.rn
FROM ranked
WHERE s.id = ranked.id
  AND (s.sort_order IS NULL OR s.sort_order <> ranked.rn);

ALTER TABLE public.servicos
  ALTER COLUMN sort_order SET NOT NULL,
  ALTER COLUMN sort_order SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_servicos_barbearia_sort_order
  ON public.servicos (barbearia_id, sort_order);
