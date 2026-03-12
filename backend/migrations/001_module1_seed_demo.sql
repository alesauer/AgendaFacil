-- Seed inicial do Módulo 1
-- Cria barbearia demo para desenvolvimento local

INSERT INTO public.barbearias (nome, slug, telefone, cidade)
VALUES ('Barbearia Demo', 'demo', '(11) 99999-0000', 'São Paulo')
ON CONFLICT (slug) DO UPDATE
SET nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone,
    cidade = EXCLUDED.cidade;
