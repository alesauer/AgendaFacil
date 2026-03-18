-- Módulo 9: status NO_SHOW para faltas de clientes

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_agendamentos_status'
      AND conrelid = 'public.agendamentos'::regclass
  ) THEN
    ALTER TABLE public.agendamentos DROP CONSTRAINT ck_agendamentos_status;
  END IF;

  ALTER TABLE public.agendamentos
    ADD CONSTRAINT ck_agendamentos_status CHECK (
      status IN (
        'PENDING_PAYMENT',
        'CONFIRMED',
        'IN_PROGRESS',
        'COMPLETED_OP',
        'COMPLETED_FIN',
        'REOPENED',
        'NO_SHOW',
        'CANCELLED',
        'BLOCKED',
        'COMPLETED'
      )
    );
END $$;
