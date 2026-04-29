# DATABASE_SCHEMA — AgendaFácil

Visão consolidada do schema baseado nas migrações em `backend/migrations` (`001` a `028`).

## Modelo multi-tenant

- O isolamento é feito por `barbearia_id` nas tabelas de domínio.
- O tenant funcional é identificado por `barbearias.slug`.

## Tabelas principais (núcleo)

### `public.barbearias`

Campos-chave:

- `id`
- `nome`
- `slug` (único)
- `telefone`
- `cidade`
- `created_at`
- `updated_at`

### `public.usuarios`

Campos-chave:

- `id`
- `barbearia_id`
- `nome`
- `telefone`
- `senha_hash`
- `role`
- `ativo`
- `created_at`
- `updated_at`

### `public.profissionais`

Campos-chave:

- `id`
- `barbearia_id`
- `nome`
- `cargo`
- `telefone`
- `foto_url`
- `ativo`
- `created_at`
- `updated_at`

### `public.clientes`

Campos-chave:

- `id`
- `barbearia_id`
- `nome`
- `telefone`
- `data_nascimento`
- `created_at`
- `updated_at`

### `public.categorias`

Campos-chave:

- `id`
- `barbearia_id`
- `nome`
- `descricao`
- `created_at`
- `updated_at`

### `public.servicos`

Campos-chave:

- `id`
- `barbearia_id`
- `categoria_id`
- `nome`
- `duracao_min`
- `preco`
- `created_at`
- `updated_at`

### `public.agendamentos`

Campos-chave:

- `id`
- `barbearia_id`
- `cliente_id`
- `profissional_id`
- `servico_id`
- `data`
- `hora_inicio`
- `hora_fim`
- `status`
- `created_at`
- `updated_at`

### `public.bloqueios`

Campos-chave:

- `id`
- `barbearia_id`
- `profissional_id`
- `data`
- `hora_inicio`
- `hora_fim`
- `motivo`
- `created_at`
- `updated_at`

### `public.barbearia_horarios_funcionamento`

Campos-chave:

- `id`
- `barbearia_id`
- `dia_semana`
- `aberto`
- `hora_inicio`
- `hora_fim`
- `created_at`
- `updated_at`

## Domínio financeiro

### `public.financial_receivables`

Contas a receber por origem operacional (ex.: agendamento).

Campos relevantes:

- `id`, `barbearia_id`, `agendamento_id`
- `origem`, `descricao`, `status`
- `valor_bruto`, `valor_recebido`, `valor_estornado`
- `vencimento`, `competencia`
- `created_at`, `updated_at`

### `public.financial_receivable_payments`

Baixas de recebíveis (pagamentos realizados).

### `public.financial_entries`

Lançamentos financeiros de apoio para rastreabilidade e visão analítica.

## Domínio de notificações

### `public.notification_provider_configs`

Configuração de provedores/canais por tenant.

### `public.notification_dispatches`

Fila de envios (status, tentativas, erro, payload e rastreio de provider).

Campos relevantes:

- `channel`, `provider_name`, `recipient`, `template_key`
- `status`, `attempts`, `last_attempt_at`
- `error_code`, `error_message`

## Assinaturas B2C de clientes

### `public.client_subscription_plans`

Planos da barbearia para assinatura de clientes.

### `public.client_subscription_plan_services`

Serviços permitidos/franquia por plano.

### `public.client_subscriptions`

Assinatura ativa/histórica do cliente.

### `public.client_subscription_usages`

Consumo de franquia/benefícios.

### `public.client_subscription_payments`

Pagamentos associados às assinaturas.

## Domínio master e runtime config

- `master_runtime_settings`
- `master_runtime_settings_audit`
- `master_runtime_config_releases`

## Onboarding e leads

### `public.leads`

Registro de leads e progresso de onboarding.

## Auditoria e suporte operacional

### `public.agendamento_status_auditoria`

Histórico de mudanças de status em agendamentos.

## Relações principais (alto nível)

- `barbearias (1:N) usuarios`
- `barbearias (1:N) profissionais`
- `barbearias (1:N) clientes`
- `barbearias (1:N) categorias`
- `categorias (1:N) servicos`
- `clientes/profissionais/servicos (1:N) agendamentos`
- `agendamentos (1:N) financial_receivables`
- `clientes (1:N) client_subscriptions`

## Observações de evolução

- O schema evolui por módulos incrementais; sempre validar mudanças novas contra as migrações numeradas.
- Para detalhes de regras e índices, usar os arquivos SQL em `backend/migrations` como fonte primária.