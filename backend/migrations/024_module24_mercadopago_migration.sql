-- Módulo 24: Migração de campos Stripe → payment genérico (provider-agnostic)
-- Renomeia colunas stripe_* para payment_* e adiciona payment_provider

ALTER TABLE public.barbearias
  RENAME COLUMN stripe_customer_id TO payment_customer_id;

ALTER TABLE public.barbearias
  RENAME COLUMN stripe_subscription_id TO payment_subscription_id;

ALTER TABLE public.barbearias
  RENAME COLUMN stripe_price_id TO payment_plan_id;

ALTER TABLE public.barbearias
  RENAME COLUMN stripe_last_event_id TO payment_last_event_id;

ALTER TABLE public.barbearias
  RENAME COLUMN stripe_last_event_type TO payment_last_event_type;

ALTER TABLE public.barbearias
  RENAME COLUMN stripe_last_event_at TO payment_last_event_at;

ALTER TABLE public.barbearias
  RENAME COLUMN stripe_webhook_updated_at TO payment_webhook_updated_at;

ALTER TABLE public.barbearias
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NULL DEFAULT 'mercadopago';

-- Recriar índices com novos nomes
DROP INDEX IF EXISTS idx_barbearias_stripe_subscription_id;
DROP INDEX IF EXISTS idx_barbearias_stripe_customer_id;
DROP INDEX IF EXISTS idx_barbearias_stripe_last_event_id;

CREATE INDEX IF NOT EXISTS idx_barbearias_payment_subscription_id
  ON public.barbearias (payment_subscription_id);

CREATE INDEX IF NOT EXISTS idx_barbearias_payment_customer_id
  ON public.barbearias (payment_customer_id);

CREATE INDEX IF NOT EXISTS idx_barbearias_payment_last_event_id
  ON public.barbearias (payment_last_event_id);
