-- Módulo 15: Permissões operacionais por perfil
-- Escopo: habilitar/desabilitar confirmação de atendimento por funcionário

ALTER TABLE public.barbearias
    ADD COLUMN IF NOT EXISTS allow_employee_confirm_appointment BOOLEAN NOT NULL DEFAULT FALSE;
