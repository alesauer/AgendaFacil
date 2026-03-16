-- Módulo 5: Identidade visual da barbearia

ALTER TABLE public.barbearias
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS icone_marca TEXT,
    ADD COLUMN IF NOT EXISTS cor_primaria TEXT,
    ADD COLUMN IF NOT EXISTS cor_secundaria TEXT;
