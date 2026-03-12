-- Módulo 2: Cadastros centrais (categorias, serviços, profissionais, clientes)
-- Compatível com Supabase PostgreSQL

CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_categorias_barbearia_nome UNIQUE (barbearia_id, nome),
    CONSTRAINT uq_categorias_barbearia_id_id UNIQUE (barbearia_id, id)
);

CREATE TABLE IF NOT EXISTS public.servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    categoria_id UUID,
    nome TEXT NOT NULL,
    duracao_min INTEGER NOT NULL,
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_servicos_duracao_min CHECK (duracao_min > 0),
    CONSTRAINT ck_servicos_preco CHECK (preco >= 0),
    CONSTRAINT uq_servicos_barbearia_nome UNIQUE (barbearia_id, nome),
    CONSTRAINT fk_servicos_categoria_tenant
      FOREIGN KEY (barbearia_id, categoria_id)
      REFERENCES public.categorias (barbearia_id, id)
      ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cargo TEXT,
    telefone TEXT,
    foto_url TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_profissionais_barbearia_nome UNIQUE (barbearia_id, nome),
    CONSTRAINT uq_profissionais_barbearia_telefone UNIQUE (barbearia_id, telefone)
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    data_nascimento DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_clientes_barbearia_telefone UNIQUE (barbearia_id, telefone)
);

CREATE INDEX IF NOT EXISTS idx_categorias_barbearia_id ON public.categorias (barbearia_id);

CREATE INDEX IF NOT EXISTS idx_servicos_barbearia_id ON public.servicos (barbearia_id);
CREATE INDEX IF NOT EXISTS idx_servicos_barbearia_categoria ON public.servicos (barbearia_id, categoria_id);

CREATE INDEX IF NOT EXISTS idx_profissionais_barbearia_id ON public.profissionais (barbearia_id);
CREATE INDEX IF NOT EXISTS idx_profissionais_barbearia_ativo ON public.profissionais (barbearia_id, ativo);

CREATE INDEX IF NOT EXISTS idx_clientes_barbearia_id ON public.clientes (barbearia_id);
CREATE INDEX IF NOT EXISTS idx_clientes_barbearia_nome ON public.clientes (barbearia_id, nome);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS trg_categorias_updated_at ON public.categorias;
    CREATE TRIGGER trg_categorias_updated_at
    BEFORE UPDATE ON public.categorias
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_servicos_updated_at ON public.servicos;
    CREATE TRIGGER trg_servicos_updated_at
    BEFORE UPDATE ON public.servicos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_profissionais_updated_at ON public.profissionais;
    CREATE TRIGGER trg_profissionais_updated_at
    BEFORE UPDATE ON public.profissionais
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_clientes_updated_at ON public.clientes;
    CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
