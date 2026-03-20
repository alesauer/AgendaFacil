-- Módulo 18: Configuração de limiar de churn
-- Escopo: permitir ajuste de dias sem retorno para considerar cliente em risco de churn

ALTER TABLE public.barbearias
    ADD COLUMN IF NOT EXISTS churn_risk_days_threshold INTEGER NOT NULL DEFAULT 45;
