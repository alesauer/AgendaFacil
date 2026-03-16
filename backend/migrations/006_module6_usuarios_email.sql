-- Módulo 6: Usuários com e-mail para autenticação

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_barbearia_email
    ON public.usuarios (barbearia_id, email)
    WHERE email IS NOT NULL;
