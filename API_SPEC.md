# API_SPEC — AgendaFácil

Documento de referência dos principais endpoints expostos pelo backend Flask.

## Convenções gerais

- Base URL local: `http://127.0.0.1:5000`
- Healthcheck: `GET /health`
- Formato de resposta:
	- sucesso: `{ "success": true, "data": ... }`
	- erro: `{ "success": false, "error": "mensagem" }`
- Tenant:
	- preferencialmente resolvido por subdomínio
	- em ambiente local, enviar `X-Barbearia-Slug`
- Autenticação:
	- rotas privadas exigem `Authorization: Bearer <JWT>`

## Autenticação e usuários (`/auth`)

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/reset-password`
- `GET /auth/me`
- `GET /auth/users`
- `POST /auth/users`
- `PUT /auth/users/<user_id>`
- `DELETE /auth/users/<user_id>`

### Master auth

- `POST /auth/master/login`
- `GET /auth/master/me`

## Barbearia (`/barbearia`)

- `GET /barbearia/identidade`
- `GET /barbearia/identidade-publica`
- `PUT /barbearia/identidade`
- `GET /barbearia/assinatura`
- `PUT /barbearia/assinatura`
- `POST /barbearia/assinatura/checkout`

## Catálogo e pessoas

### Categorias (`/categorias`)

- `GET /categorias`
- `POST /categorias`
- `PUT /categorias/<categoria_id>`
- `DELETE /categorias/<categoria_id>`

### Serviços (`/servicos`)

- `GET /servicos`
- `GET /servicos/publico`
- `POST /servicos`
- `PUT /servicos/ordem`
- `PUT /servicos/<servico_id>`
- `DELETE /servicos/<servico_id>`

### Profissionais (`/profissionais`)

- `GET /profissionais`
- `GET /profissionais/publico`
- `POST /profissionais`
- `PUT /profissionais/<profissional_id>`
- `DELETE /profissionais/<profissional_id>`

### Clientes (`/clientes`)

- `GET /clientes`
- `POST /clientes`
- `PUT /clientes/<cliente_id>`
- `DELETE /clientes/<cliente_id>`
- `GET /clientes/publico/por-telefone`
- `POST /clientes/publico`

## Agenda

- `GET /agenda/disponibilidade`
- `GET /agenda/disponibilidade/publico`
- `POST /agendamentos`
- `POST /agendamentos/publico`
- `GET /agendamentos`
- `GET /agendamentos/publico`
- `PUT /agendamentos/<agendamento_id>`
- `PATCH /agendamentos/<agendamento_id>/status`
- `DELETE /agendamentos/<agendamento_id>`
- `PATCH /agendamentos/publico/<agendamento_id>/cancelar`
- `PUT /agendamentos/publico/<agendamento_id>`

### Bloqueios de agenda

- `POST /agenda/bloqueios`
- `PUT /agenda/bloqueios/<bloqueio_id>`
- `DELETE /agenda/bloqueios/<bloqueio_id>`

### Horários de funcionamento (`/horarios-funcionamento`)

- `GET /horarios-funcionamento`
- `GET /horarios-funcionamento/publico`
- `PUT /horarios-funcionamento`

## Dashboard (`/dashboard`)

- `GET /dashboard/metricas`
- `GET /dashboard/insights`

## Financeiro

- `GET /financeiro/resumo`
- `GET /financeiro/recebiveis`
- `POST /financeiro/recebiveis/<receivable_id>/pagamentos`
- `POST /financeiro/recebiveis/<receivable_id>/estorno`

## Assinaturas B2C de clientes

- `GET /clientes/assinaturas/planos`
- `POST /clientes/assinaturas/planos`
- `PUT /clientes/assinaturas/planos/<plano_id>`
- `DELETE /clientes/assinaturas/planos/<plano_id>`
- `GET /clientes/assinaturas/clientes`
- `GET /clientes/<cliente_id>/assinatura`
- `PUT /clientes/<cliente_id>/assinatura`
- `PATCH /clientes/<cliente_id>/assinatura/status`
- `DELETE /clientes/<cliente_id>/assinatura`
- `POST /clientes/<cliente_id>/assinatura/pagamentos`
- `GET /clientes/<cliente_id>/assinatura/pagamentos`

## Notificações internas

- `GET /internal/notifications/whatsapp/evolution/state`
- `POST /internal/notifications/whatsapp/evolution/instance`
- `POST /internal/notifications/whatsapp/evolution/disconnect`
- `GET /internal/notifications/channels/settings`
- `PUT /internal/notifications/channels/settings`
- `POST /internal/notifications/test-whatsapp`
- `POST /internal/notifications/test-email`
- `POST /internal/notifications/support/contact`
- `GET /internal/notifications/dispatches`
- `POST /internal/notifications/dispatches/<dispatch_id>/retry`

## Módulo master

### Master (`/master`)

- `GET /master/tenants`
- `GET /master/overview`
- `PUT /master/tenants/<tenant_id>`
- `PATCH /master/tenants/<tenant_id>/block`
- `POST /master/tenants/<tenant_id>/impersonate`
- `DELETE /master/tenants/<tenant_id>`
- `POST /master/lab/provision`
- `GET /master/lab/checkin/search`
- `POST /master/lab/checkin/<agendamento_id>`

### Master settings (`/master/settings`)

- `GET /master/settings/catalog`
- `GET /master/settings`
- `PUT /master/settings/<path:setting_key>`
- `POST /master/settings/test`
- `POST /master/settings/publish`
- `GET /master/settings/releases`
- `POST /master/settings/rollback/<int:version>`

## Webhooks de pagamento

- `POST /mercadopago/webhook` (registrado no app)
- `POST /stripe/webhook` (arquivo existente, não registrado em `backend/routes/__init__.py`)