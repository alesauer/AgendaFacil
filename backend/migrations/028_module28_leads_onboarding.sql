-- Módulo 28: Leads de landing page + retomada de onboarding
-- Objetivo: separar captação (lead) da conta ativa e permitir retomada por token

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Estado do funil
    status TEXT NOT NULL DEFAULT 'LEAD',
    onboarding_step TEXT NOT NULL DEFAULT 'CONTA',

    -- Dados principais captados na landing
    nome_negocio TEXT NOT NULL,
    nome_responsavel TEXT,
    segmento TEXT,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,

    -- Normalizações para busca/deduplicação
    email_normalizado TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
    telefone_normalizado TEXT GENERATED ALWAYS AS (regexp_replace(coalesce(telefone, ''), '[^0-9]+', '', 'g')) STORED,

    -- Retomada de onboarding
    resume_token TEXT,
    resume_expires_at TIMESTAMPTZ,
    onboarding_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Origem de aquisição
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    referrer_url TEXT,
    landing_path TEXT,
    landing_variant TEXT,

    -- Conversão para tenant (quando virar conta ativa)
    converted_barbearia_id UUID REFERENCES public.barbearias(id) ON DELETE SET NULL,
    converted_at TIMESTAMPTZ,

    -- Fechamento/qualidade
    lost_reason TEXT,
    is_test BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_leads_status CHECK (
      status IN ('LEAD', 'IN_PROGRESS', 'CONVERTED', 'LOST', 'DUPLICATE')
    ),
    CONSTRAINT ck_leads_onboarding_step CHECK (
      onboarding_step IN ('CONTA', 'EQUIPE', 'HORARIOS', 'SERVICOS', 'FINALIZADO')
    ),
    CONSTRAINT ck_leads_email_basico CHECK (position('@' in email) > 1)
);

-- Token de retomada deve ser único quando existir
CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_resume_token
  ON public.leads (resume_token)
  WHERE resume_token IS NOT NULL;

-- Índices de consulta operacional/funil
CREATE INDEX IF NOT EXISTS idx_leads_status_created_at
  ON public.leads (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_created_at
  ON public.leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_onboarding_step
  ON public.leads (onboarding_step, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_email_normalizado
  ON public.leads (email_normalizado);

CREATE INDEX IF NOT EXISTS idx_leads_telefone_normalizado
  ON public.leads (telefone_normalizado);

CREATE INDEX IF NOT EXISTS idx_leads_converted_barbearia_id
  ON public.leads (converted_barbearia_id)
  WHERE converted_barbearia_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign
  ON public.leads (utm_campaign, created_at DESC)
  WHERE utm_campaign IS NOT NULL;

-- Atualização automática de updated_at
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
