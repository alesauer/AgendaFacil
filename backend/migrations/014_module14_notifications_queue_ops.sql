-- Módulo 14: Notifications queue operations
-- Escopo: campos de lock/retry para fila operacional

ALTER TABLE public.notification_dispatches
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;

UPDATE public.notification_dispatches
SET next_retry_at = COALESCE(next_retry_at, created_at)
WHERE next_retry_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_dispatches_due
  ON public.notification_dispatches (barbearia_id, status, next_retry_at ASC);

CREATE INDEX IF NOT EXISTS idx_notification_dispatches_lock
  ON public.notification_dispatches (barbearia_id, locked_at);
