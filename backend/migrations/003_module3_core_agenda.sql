-- Módulo 3: Estrutura de agenda (agendamentos e bloqueios)
-- Compatível com Supabase PostgreSQL

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_servicos_barbearia_id_id'
    ) THEN
        ALTER TABLE public.servicos
        ADD CONSTRAINT uq_servicos_barbearia_id_id UNIQUE (barbearia_id, id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_profissionais_barbearia_id_id'
    ) THEN
        ALTER TABLE public.profissionais
        ADD CONSTRAINT uq_profissionais_barbearia_id_id UNIQUE (barbearia_id, id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_clientes_barbearia_id_id'
    ) THEN
        ALTER TABLE public.clientes
        ADD CONSTRAINT uq_clientes_barbearia_id_id UNIQUE (barbearia_id, id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL,
    profissional_id UUID NOT NULL,
    servico_id UUID NOT NULL,
    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_agendamentos_status CHECK (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'BLOCKED')),
    CONSTRAINT ck_agendamentos_horas CHECK (hora_fim > hora_inicio),
    CONSTRAINT fk_agendamentos_cliente_tenant
      FOREIGN KEY (barbearia_id, cliente_id)
      REFERENCES public.clientes (barbearia_id, id)
      ON DELETE RESTRICT,
    CONSTRAINT fk_agendamentos_profissional_tenant
      FOREIGN KEY (barbearia_id, profissional_id)
      REFERENCES public.profissionais (barbearia_id, id)
      ON DELETE RESTRICT,
    CONSTRAINT fk_agendamentos_servico_tenant
      FOREIGN KEY (barbearia_id, servico_id)
      REFERENCES public.servicos (barbearia_id, id)
      ON DELETE RESTRICT,
    CONSTRAINT uq_agendamentos_profissional_data_hora
      UNIQUE (barbearia_id, profissional_id, data, hora_inicio)
);

CREATE TABLE IF NOT EXISTS public.bloqueios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    profissional_id UUID NOT NULL,
    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    motivo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_bloqueios_horas CHECK (hora_fim > hora_inicio),
    CONSTRAINT fk_bloqueios_profissional_tenant
      FOREIGN KEY (barbearia_id, profissional_id)
      REFERENCES public.profissionais (barbearia_id, id)
      ON DELETE CASCADE,
    CONSTRAINT uq_bloqueios_profissional_data_hora
      UNIQUE (barbearia_id, profissional_id, data, hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia_data
    ON public.agendamentos (barbearia_id, data);

CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia_profissional_data
    ON public.agendamentos (barbearia_id, profissional_id, data);

CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia_status
    ON public.agendamentos (barbearia_id, status);

CREATE INDEX IF NOT EXISTS idx_bloqueios_barbearia_profissional_data
    ON public.bloqueios (barbearia_id, profissional_id, data);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS trg_agendamentos_updated_at ON public.agendamentos;
    CREATE TRIGGER trg_agendamentos_updated_at
    BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_bloqueios_updated_at ON public.bloqueios;
    CREATE TRIGGER trg_bloqueios_updated_at
    BEFORE UPDATE ON public.bloqueios
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
