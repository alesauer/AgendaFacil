-- Módulo 8: adicionar e-mail ao cadastro de clientes

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_barbearia_email
  ON public.clientes (barbearia_id, email)
  WHERE email IS NOT NULL;
