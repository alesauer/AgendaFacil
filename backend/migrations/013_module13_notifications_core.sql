-- Módulo 13: Notifications core (provider-agnostic)
-- Escopo: configuração por tenant/canal e rastreio de dispatches

CREATE TABLE IF NOT EXISTS public.notification_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP', 'EMAIL')),
  provider_name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_provider_active
  ON public.notification_provider_configs (barbearia_id, channel)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS public.notification_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP', 'EMAIL')),
  provider_name TEXT NOT NULL,
  recipient TEXT NOT NULL,
  template_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL,
  correlation_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'SENT', 'FAILED', 'RETRYING')),
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_ref TEXT,
  error_code TEXT,
  error_message TEXT,
  provider_response JSONB,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_dispatch_idempotency
  ON public.notification_dispatches (barbearia_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_notification_dispatches_status
  ON public.notification_dispatches (barbearia_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_dispatches_channel
  ON public.notification_dispatches (barbearia_id, channel, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS trg_notification_provider_configs_updated_at ON public.notification_provider_configs;
    CREATE TRIGGER trg_notification_provider_configs_updated_at
    BEFORE UPDATE ON public.notification_provider_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_notification_dispatches_updated_at ON public.notification_dispatches;
    CREATE TRIGGER trg_notification_dispatches_updated_at
    BEFORE UPDATE ON public.notification_dispatches
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
