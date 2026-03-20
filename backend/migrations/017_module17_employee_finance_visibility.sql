-- Módulo 17: Permissão de visualização do financeiro por funcionário
-- Escopo: habilitar/desabilitar a aba Financeiro para perfil Funcionário / Equipe

ALTER TABLE public.barbearias
    ADD COLUMN IF NOT EXISTS allow_employee_view_finance BOOLEAN NOT NULL DEFAULT FALSE;
