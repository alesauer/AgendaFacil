-- Módulo 11: Personalização da tela de login
-- Escopo: persistência de logo e imagem de fundo para tela de login

ALTER TABLE public.barbearias
    ADD COLUMN IF NOT EXISTS login_logo_url TEXT,
    ADD COLUMN IF NOT EXISTS login_background_url TEXT;
