-- Módulo 19: Métricas persistidas de clientes
-- Escopo: armazenar cortes, total gasto e última visita para atualização automática

ALTER TABLE public.clientes
    ADD COLUMN IF NOT EXISTS cortes_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gasto NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ultima_visita DATE;

UPDATE public.clientes c
SET
    cortes_count = COALESCE(stats.cortes_count, 0),
    total_gasto = COALESCE(stats.total_gasto, 0),
    ultima_visita = stats.ultima_visita
FROM (
    SELECT
        barbearia_id,
        cliente_id,
        COUNT(*)::int AS cortes_count,
        COALESCE(SUM(COALESCE(valor_final, 0)), 0)::numeric(10,2) AS total_gasto,
        MAX(data) AS ultima_visita
    FROM public.agendamentos
    WHERE status IN ('COMPLETED_OP', 'COMPLETED_FIN', 'COMPLETED')
    GROUP BY barbearia_id, cliente_id
) stats
WHERE c.barbearia_id = stats.barbearia_id
  AND c.id = stats.cliente_id;
