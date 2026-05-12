-- Módulo 29: Marketing Leads (Landing Page)
-- Objetivo: capturar leads do modal da landing page com validação WhatsApp

CREATE TABLE IF NOT EXISTS public.marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados capturados
    name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255),
    
    -- Origem e rastreamento
    source VARCHAR(50) DEFAULT 'landing_vercel',  -- landing_vercel, referral, etc
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Status do pipeline
    status VARCHAR(20) DEFAULT 'PROSPECT',  -- PROSPECT, ONBOARDING, PAYING, COLD, INVALID
    validation_status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, VALID, INVALID
    
    -- Interações
    first_interaction_at TIMESTAMPTZ,
    last_interaction_at TIMESTAMPTZ,
    whatsapp_sent_at TIMESTAMPTZ,
    whatsapp_opened_at TIMESTAMPTZ,
    link_clicked_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices separadamente (sintaxe correta PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_marketing_leads_whatsapp ON public.marketing_leads (whatsapp);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON public.marketing_leads (status);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_created_at ON public.marketing_leads (created_at);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_last_interaction ON public.marketing_leads (last_interaction_at);

-- Enable RLS para segurança (se usar Supabase)
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- Policy: permitir anonymous inserts (para landing page)
CREATE POLICY "Allow anonymous inserts" ON public.marketing_leads
    FOR INSERT WITH CHECK (true);

-- Policy: permitir authenticated users (master/admin) ler todos
CREATE POLICY "Allow authenticated to read all" ON public.marketing_leads
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: permitir updates apenas por authenticated users
CREATE POLICY "Allow authenticated to update" ON public.marketing_leads
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_marketing_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_marketing_leads_updated_at ON public.marketing_leads;
CREATE TRIGGER trigger_marketing_leads_updated_at
    BEFORE UPDATE ON public.marketing_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_marketing_leads_updated_at();
