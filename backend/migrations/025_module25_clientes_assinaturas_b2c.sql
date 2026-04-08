-- Module 25: Assinaturas B2C (clientes da barbearia)

CREATE TABLE IF NOT EXISTS public.client_subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    valor_mensal_centavos INTEGER NOT NULL,
    dias_carencia INTEGER NOT NULL DEFAULT 7,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_client_subscription_plans_valor CHECK (valor_mensal_centavos > 0),
    CONSTRAINT ck_client_subscription_plans_carencia CHECK (dias_carencia >= 0 AND dias_carencia <= 30)
);

CREATE INDEX IF NOT EXISTS idx_client_subscription_plans_tenant
  ON public.client_subscription_plans (barbearia_id, ativo);

CREATE TABLE IF NOT EXISTS public.client_subscription_plan_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plano_id UUID NOT NULL REFERENCES public.client_subscription_plans(id) ON DELETE CASCADE,
    servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
    quantidade_mensal INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_client_subscription_plan_services_qtd CHECK (quantidade_mensal > 0),
    CONSTRAINT uq_client_subscription_plan_services UNIQUE (plano_id, servico_id)
);

CREATE INDEX IF NOT EXISTS idx_client_subscription_plan_services_plan
  ON public.client_subscription_plan_services (plano_id);

CREATE TABLE IF NOT EXISTS public.client_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    plano_id UUID NOT NULL REFERENCES public.client_subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_cycle_start DATE NOT NULL,
    current_cycle_end DATE NOT NULL,
    next_due_at TIMESTAMPTZ NOT NULL,
    grace_until TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    last_payment_at TIMESTAMPTZ,
    last_payment_amount_centavos INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_client_subscriptions_status CHECK (status IN ('ACTIVE', 'GRACE', 'PAST_DUE', 'PAUSED', 'CANCELLED')),
    CONSTRAINT ck_client_subscriptions_cycle CHECK (current_cycle_end >= current_cycle_start)
);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_tenant
  ON public.client_subscriptions (barbearia_id, cliente_id, status);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_due
  ON public.client_subscriptions (barbearia_id, next_due_at, status);

CREATE TABLE IF NOT EXISTS public.client_subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.client_subscriptions(id) ON DELETE CASCADE,
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    cycle_start DATE NOT NULL,
    cycle_end DATE NOT NULL,
    amount_centavos INTEGER NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metodo TEXT NOT NULL,
    observacao TEXT,
    created_by TEXT,
    created_role TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_client_subscription_payments_amount CHECK (amount_centavos > 0)
);

CREATE INDEX IF NOT EXISTS idx_client_subscription_payments_subscription
  ON public.client_subscription_payments (subscription_id, paid_at DESC);

CREATE TABLE IF NOT EXISTS public.client_subscription_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.client_subscriptions(id) ON DELETE CASCADE,
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
    servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL DEFAULT 1,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_client_subscription_usages_quantidade CHECK (quantidade > 0),
    CONSTRAINT uq_client_subscription_usage_appointment UNIQUE (agendamento_id)
);

CREATE INDEX IF NOT EXISTS idx_client_subscription_usages_subscription
  ON public.client_subscription_usages (subscription_id, used_at DESC);
