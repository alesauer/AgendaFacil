-- Módulo 23: Campos de rastreio Stripe para webhook direto

ALTER TABLE public.barbearias
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS stripe_last_event_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS stripe_last_event_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS stripe_last_event_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS stripe_webhook_updated_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_barbearias_stripe_subscription_id
  ON public.barbearias (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_barbearias_stripe_customer_id
  ON public.barbearias (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_barbearias_stripe_last_event_id
  ON public.barbearias (stripe_last_event_id);
