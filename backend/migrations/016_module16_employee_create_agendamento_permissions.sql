-- Módulo 16: Permissão de criação de agendamento por funcionário
-- Escopo: habilitar/desabilitar criação de novos agendamentos pelo perfil Funcionário / Equipe

ALTER TABLE public.barbearias
    ADD COLUMN IF NOT EXISTS allow_employee_create_appointment BOOLEAN NOT NULL DEFAULT TRUE;
