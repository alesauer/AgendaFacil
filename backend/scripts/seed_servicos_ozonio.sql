-- Seed de serviços + categorias (idempotente)
-- Uso: execute no Supabase SQL Editor
-- Ajuste o slug abaixo conforme a barbearia alvo

DO $$
DECLARE
    target_slug TEXT := 'demo';
    tenant_id UUID;
BEGIN
    SELECT id
      INTO tenant_id
      FROM public.barbearias
     WHERE slug = target_slug
     LIMIT 1;

    IF tenant_id IS NULL THEN
        RAISE EXCEPTION 'Barbearia com slug "%" não encontrada.', target_slug;
    END IF;

    -- 1) Categorias
    INSERT INTO public.categorias (barbearia_id, nome, descricao)
    VALUES
        (tenant_id, 'Combo', 'Pacotes e promoções combinadas'),
        (tenant_id, 'Cabelo', 'Cortes e serviços capilares'),
        (tenant_id, 'Barba', 'Serviços de barba e acabamento de rosto'),
        (tenant_id, 'Tratamentos com Ozônio', 'Procedimentos com tecnologia de ozônio'),
        (tenant_id, 'Química Capilar', 'Selagem, relaxamento, platinado e luzes'),
        (tenant_id, 'Estética Facial', 'Cuidados faciais e sobrancelha'),
        (tenant_id, 'Acabamento', 'Finalização rápida e pezinho'),
        (tenant_id, 'Depilação', 'Depilação de áreas específicas')
    ON CONFLICT (barbearia_id, nome)
    DO UPDATE SET
        descricao = EXCLUDED.descricao;

    -- 2) Serviços (preços e duração podem ser ajustados depois)
    WITH servicos_seed (categoria_nome, nome, duracao_min, preco) AS (
        VALUES
            ('Combo', 'Combo Corte + Barba c/ Ozônio', 75, 0::numeric),
            ('Combo', 'Combo Corte e Barba', 60, 0::numeric),
            ('Barba', 'Barba com Ozônio', 35, 0::numeric),
            ('Estética Facial', 'Limpeza de Pele com Ozônio', 60, 0::numeric),
            ('Cabelo', 'Corte', 30, 0::numeric),
            ('Barba', 'Barba', 25, 0::numeric),
            ('Tratamentos com Ozônio', 'Hidratação Capilar com Ozônio', 45, 0::numeric),
            ('Cabelo', '1 pente (corte todo na máquina sem degradê)', 25, 0::numeric),
            ('Química Capilar', 'Selagem', 90, 0::numeric),
            ('Química Capilar', 'Relaxamento', 60, 0::numeric),
            ('Estética Facial', 'Sobrancelha', 15, 0::numeric),
            ('Acabamento', 'Acabamento / Pezinho', 15, 0::numeric),
            ('Combo', 'Promo Corte + Selagem', 110, 0::numeric),
            ('Química Capilar', 'Platinado', 120, 0::numeric),
            ('Química Capilar', 'Luzes Platinado', 140, 0::numeric),
            ('Química Capilar', 'Luzes Loiro', 130, 0::numeric),
            ('Depilação', 'Depilação Nariz', 10, 0::numeric),
            ('Depilação', 'Depilação Orelha', 10, 0::numeric)
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

    RAISE NOTICE 'Seed aplicado para barbearia slug=%', target_slug;
END $$;
