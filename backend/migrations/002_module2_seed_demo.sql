-- Módulo 2: Seed demo (categorias, serviços, profissionais, clientes)
-- Execute após:
-- 1) 001_module1_base_saas.sql
-- 2) 001_module1_seed_demo.sql
-- 3) 002_module2_core_entities.sql

DO $$
DECLARE
    tenant_id UUID;
BEGIN
    SELECT id
      INTO tenant_id
      FROM public.barbearias
     WHERE slug = 'demo'
     LIMIT 1;

    IF tenant_id IS NULL THEN
        RAISE EXCEPTION 'Barbearia demo não encontrada. Execute 001_module1_seed_demo.sql antes deste seed.';
    END IF;

    INSERT INTO public.categorias (barbearia_id, nome, descricao)
    VALUES
        (tenant_id, 'Cabelo', 'Cortes e tratamentos capilares'),
        (tenant_id, 'Barba', 'Cuidados com a barba e rosto'),
        (tenant_id, 'Combo', 'Pacotes promocionais de serviços'),
        (tenant_id, 'Estética', 'Tratamentos faciais e corporais')
    ON CONFLICT (barbearia_id, nome)
    DO UPDATE SET
        descricao = EXCLUDED.descricao;

    WITH servicos_seed (categoria_nome, nome, duracao_min, preco) AS (
        VALUES
            ('Cabelo', 'Corte de Cabelo Masculino', 30, 50.00::numeric),
            ('Barba', 'Barba Terapia', 30, 35.00::numeric),
            ('Combo', 'Corte + Barba (Combo)', 60, 80.00::numeric),
            ('Estética', 'Limpeza de Pele', 45, 120.00::numeric)
    )
    INSERT INTO public.servicos (barbearia_id, categoria_id, nome, duracao_min, preco)
    SELECT
        tenant_id,
        c.id,
        s.nome,
        s.duracao_min,
        s.preco
    FROM servicos_seed s
    JOIN public.categorias c
      ON c.barbearia_id = tenant_id
     AND c.nome = s.categoria_nome
    ON CONFLICT (barbearia_id, nome)
    DO UPDATE SET
        categoria_id = EXCLUDED.categoria_id,
        duracao_min = EXCLUDED.duracao_min,
        preco = EXCLUDED.preco;

    INSERT INTO public.profissionais (barbearia_id, nome, cargo, telefone, foto_url, ativo)
    VALUES
        (tenant_id, 'Flávio Santos', 'Barbeiro Master', '11911110001', 'https://i.pravatar.cc/150?u=flavio', true),
        (tenant_id, 'Marcela Ribeiro', 'Esteticista', '11911110002', 'https://i.pravatar.cc/150?u=marcela', true),
        (tenant_id, 'Carla Dias', 'Barbeira Jr', '11911110003', 'https://i.pravatar.cc/150?u=carla', true),
        (tenant_id, 'Gabriela Lima', 'Colorista', '11911110004', 'https://i.pravatar.cc/150?u=gabriela', true),
        (tenant_id, 'Rafael Costa', 'Barbeiro Jr', '11911110005', 'https://i.pravatar.cc/150?u=rafael', true),
        (tenant_id, 'Camila Oliveira', 'Manicure', '11911110006', 'https://i.pravatar.cc/150?u=camila', true)
    ON CONFLICT (barbearia_id, telefone)
    DO UPDATE SET
        nome = EXCLUDED.nome,
        cargo = EXCLUDED.cargo,
        foto_url = EXCLUDED.foto_url,
        ativo = EXCLUDED.ativo;

    INSERT INTO public.clientes (barbearia_id, nome, telefone, data_nascimento)
    VALUES
        (tenant_id, 'João Silva', '(11) 98888-7777', '1990-05-15'::date),
        (tenant_id, 'Maria Oliveira', '(11) 97777-6666', '1985-10-20'::date),
        (tenant_id, 'Pedro Santos', '(11) 96666-5555', '1995-01-10'::date),
        (tenant_id, 'Ana Costa', '(11) 95555-4444', '1992-07-30'::date)
    ON CONFLICT (barbearia_id, telefone)
    DO UPDATE SET
        nome = EXCLUDED.nome,
        data_nascimento = EXCLUDED.data_nascimento;
END $$;
