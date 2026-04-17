-- Módulo 26: permissão para funcionário/equipe visualizar aba de usuários

ALTER TABLE public.barbearias
  ADD COLUMN IF NOT EXISTS allow_employee_view_users BOOLEAN NOT NULL DEFAULT FALSE;
