-- Módulo 3: Seed demo de agendamentos
-- Pré-requisitos:
-- 1) 001_module1_base_saas.sql
-- 2) 001_module1_seed_demo.sql
-- 3) 002_module2_core_entities.sql
-- 4) 002_module2_seed_demo.sql
-- 5) 003_module3_core_agenda.sql

DO $$
DECLARE
    tenant_id UUID;
    cliente_joao UUID;
    cliente_maria UUID;
    cliente_pedro UUID;
    cliente_ana UUID;
    prof_flavio UUID;
    prof_marcela UUID;
    prof_carla UUID;
    srv_corte UUID;
    srv_barba UUID;
    srv_limpeza UUID;
BEGIN
    IF to_regclass('public.agendamentos') IS NULL THEN
        RAISE EXCEPTION 'Tabela public.agendamentos não encontrada. Crie as tabelas de agenda antes de rodar este seed.';
    END IF;

    IF to_regclass('public.bloqueios') IS NULL THEN
        RAISE EXCEPTION 'Tabela public.bloqueios não encontrada. Crie as tabelas de agenda antes de rodar este seed.';
    END IF;

    SELECT id INTO tenant_id
      FROM public.barbearias
     WHERE slug = 'demo'
     LIMIT 1;

    IF tenant_id IS NULL THEN
        RAISE EXCEPTION 'Barbearia demo não encontrada. Execute os seeds do módulo 1 antes deste script.';
    END IF;

    SELECT id INTO cliente_joao FROM public.clientes WHERE barbearia_id = tenant_id AND nome = 'João Silva' LIMIT 1;
    SELECT id INTO cliente_maria FROM public.clientes WHERE barbearia_id = tenant_id AND nome = 'Maria Oliveira' LIMIT 1;
    SELECT id INTO cliente_pedro FROM public.clientes WHERE barbearia_id = tenant_id AND nome = 'Pedro Santos' LIMIT 1;
    SELECT id INTO cliente_ana FROM public.clientes WHERE barbearia_id = tenant_id AND nome = 'Ana Costa' LIMIT 1;

    SELECT id INTO prof_flavio FROM public.profissionais WHERE barbearia_id = tenant_id AND nome = 'Flávio Santos' LIMIT 1;
    SELECT id INTO prof_marcela FROM public.profissionais WHERE barbearia_id = tenant_id AND nome = 'Marcela Ribeiro' LIMIT 1;
    SELECT id INTO prof_carla FROM public.profissionais WHERE barbearia_id = tenant_id AND nome = 'Carla Dias' LIMIT 1;

    SELECT id INTO srv_corte FROM public.servicos WHERE barbearia_id = tenant_id AND nome = 'Corte de Cabelo Masculino' LIMIT 1;
    SELECT id INTO srv_barba FROM public.servicos WHERE barbearia_id = tenant_id AND nome = 'Barba Terapia' LIMIT 1;
    SELECT id INTO srv_limpeza FROM public.servicos WHERE barbearia_id = tenant_id AND nome = 'Limpeza de Pele' LIMIT 1;

    IF cliente_joao IS NULL OR cliente_maria IS NULL OR cliente_pedro IS NULL OR cliente_ana IS NULL THEN
        RAISE EXCEPTION 'Clientes base não encontrados. Execute 002_module2_seed_demo.sql antes deste script.';
    END IF;

    IF prof_flavio IS NULL OR prof_marcela IS NULL OR prof_carla IS NULL THEN
        RAISE EXCEPTION 'Profissionais base não encontrados. Execute 002_module2_seed_demo.sql antes deste script.';
    END IF;

    IF srv_corte IS NULL OR srv_barba IS NULL OR srv_limpeza IS NULL THEN
        RAISE EXCEPTION 'Serviços base não encontrados. Execute 002_module2_seed_demo.sql antes deste script.';
    END IF;

    INSERT INTO public.agendamentos (
        barbearia_id, cliente_id, profissional_id, servico_id, data, hora_inicio, hora_fim, status
    )
    SELECT *
    FROM (
        VALUES
            (tenant_id, cliente_joao,  prof_flavio,  srv_corte,   DATE '2026-03-09', TIME '09:30', TIME '10:00', 'CONFIRMED'),
            (tenant_id, cliente_maria, prof_flavio,  srv_barba,   DATE '2026-03-09', TIME '10:00', TIME '10:30', 'CONFIRMED'),
            (tenant_id, cliente_pedro, prof_marcela, srv_limpeza, DATE '2026-03-09', TIME '10:30', TIME '11:15', 'CONFIRMED'),
            (tenant_id, cliente_ana,   prof_carla,   srv_corte,   DATE '2026-03-09', TIME '11:00', TIME '11:30', 'CONFIRMED'),
            (tenant_id, cliente_joao,  prof_flavio,  srv_barba,   DATE '2026-03-10', TIME '13:00', TIME '13:30', 'PENDING_PAYMENT'),
            (tenant_id, cliente_maria, prof_marcela, srv_limpeza, DATE '2026-03-10', TIME '14:00', TIME '14:45', 'CONFIRMED'),
            (tenant_id, cliente_pedro, prof_carla,   srv_corte,   DATE '2026-03-11', TIME '09:00', TIME '09:30', 'COMPLETED'),
            (tenant_id, cliente_ana,   prof_flavio,  srv_barba,   DATE '2026-03-11', TIME '16:00', TIME '16:30', 'CANCELLED')
    ) AS seed_data (
        barbearia_id, cliente_id, profissional_id, servico_id, data, hora_inicio, hora_fim, status
    )
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.agendamentos a
        WHERE a.barbearia_id = seed_data.barbearia_id
          AND a.cliente_id = seed_data.cliente_id
          AND a.profissional_id = seed_data.profissional_id
          AND a.servico_id = seed_data.servico_id
          AND a.data = seed_data.data
          AND a.hora_inicio = seed_data.hora_inicio
    );

    INSERT INTO public.bloqueios (
        barbearia_id, profissional_id, data, hora_inicio, hora_fim, motivo
    )
    SELECT *
    FROM (
        VALUES
            (tenant_id, prof_flavio, DATE '2026-03-12', TIME '12:00', TIME '13:00', 'Almoço'),
            (tenant_id, prof_carla,  DATE '2026-03-12', TIME '15:00', TIME '15:30', 'Intervalo')
    ) AS bloqueios_seed (
        barbearia_id, profissional_id, data, hora_inicio, hora_fim, motivo
    )
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.bloqueios b
        WHERE b.barbearia_id = bloqueios_seed.barbearia_id
          AND b.profissional_id = bloqueios_seed.profissional_id
          AND b.data = bloqueios_seed.data
          AND b.hora_inicio = bloqueios_seed.hora_inicio
    );
END $$;
