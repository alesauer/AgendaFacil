-- Módulo 20: Permissão de visualização de Relatórios por funcionário
-- Escopo: habilitar/desabilitar a aba Relatórios para perfil Funcionário / Equipe

ALTER TABLE public.barbearias
    ADD COLUMN IF NOT EXISTS allow_employee_view_reports BOOLEAN NOT NULL DEFAULT FALSE;
