-- Módulo 4: Horários de funcionamento por barbearia

CREATE TABLE IF NOT EXISTS public.barbearia_horarios_funcionamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    dia_semana SMALLINT NOT NULL,
    aberto BOOLEAN NOT NULL DEFAULT TRUE,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_barbearia_horarios_dia_semana CHECK (dia_semana BETWEEN 0 AND 6),
    CONSTRAINT ck_barbearia_horarios_horas CHECK (
      (aberto = false) OR (hora_fim > hora_inicio)
    ),
    CONSTRAINT uq_barbearia_horarios_funcionamento UNIQUE (barbearia_id, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_barbearia_horarios_funcionamento_tenant
    ON public.barbearia_horarios_funcionamento (barbearia_id, dia_semana);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS trg_barbearia_horarios_funcionamento_updated_at ON public.barbearia_horarios_funcionamento;
    CREATE TRIGGER trg_barbearia_horarios_funcionamento_updated_at
    BEFORE UPDATE ON public.barbearia_horarios_funcionamento
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
