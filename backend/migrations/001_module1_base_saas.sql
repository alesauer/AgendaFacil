-- Módulo 1: Base SaaS (barbearias, usuarios, auth/JWT, tenant)
-- Compatível com Supabase PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.barbearias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT NOT NULL,
    telefone TEXT,
    cidade TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_barbearias_slug UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_usuarios_role CHECK (role IN ('ADMIN', 'EMPLOYEE', 'CLIENT')),
    CONSTRAINT uq_usuarios_barbearia_telefone UNIQUE (barbearia_id, telefone)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_barbearia_id ON public.usuarios (barbearia_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_barbearia_role ON public.usuarios (barbearia_id, role);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_barbearias_updated_at ON public.barbearias;
CREATE TRIGGER trg_barbearias_updated_at
BEFORE UPDATE ON public.barbearias
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
