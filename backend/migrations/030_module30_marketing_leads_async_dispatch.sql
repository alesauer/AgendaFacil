-- Módulo 30: Envio assíncrono de WhatsApp para leads
-- Objetivo: desacoplar captura de lead do envio ao provider, com retries/backoff

ALTER TABLE IF EXISTS public.marketing_leads
    ADD COLUMN IF NOT EXISTS whatsapp_dispatch_status VARCHAR(20) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS whatsapp_dispatch_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS whatsapp_next_retry_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS whatsapp_last_error TEXT;

UPDATE public.marketing_leads
SET whatsapp_dispatch_status = COALESCE(whatsapp_dispatch_status, 'PENDING'),
    whatsapp_dispatch_attempts = COALESCE(whatsapp_dispatch_attempts, 0)
WHERE whatsapp_dispatch_status IS NULL
   OR whatsapp_dispatch_attempts IS NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_leads_dispatch_status
    ON public.marketing_leads (whatsapp_dispatch_status);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_next_retry
    ON public.marketing_leads (whatsapp_next_retry_at);
