# AI_CONTEXT — AgendaFácil

Este arquivo é o contexto de referência para assistentes de código no projeto.

## 1) Produto e escopo

AgendaFácil é um SaaS multi-tenant para barbearias com os domínios:

- autenticação e usuários
- agenda e disponibilidade
- profissionais, serviços e categorias
- clientes e assinaturas B2C
- financeiro
- notificações (WhatsApp/e-mail)
- administração master de tenants

## 2) Stack atual (fonte de verdade)

### Frontend

- React 19 + TypeScript + Vite
- clientes de API em `services/*.ts`
- telas em `views/*.tsx`

### Backend

- Flask 3 com blueprints por módulo (`backend/routes`)
- configuração central em `backend/config.py`
- criação da app em `backend/app.py`
- middleware de tenant em `backend/middleware/tenant.py`

### Banco e dados

- Supabase PostgreSQL
- migrações SQL versionadas em `backend/migrations`
- modo operacional padrão: `SUPABASE_ONLY=true`

### Notificações e integrações

- WhatsApp: Evolution API
- E-mail: Resend
- Pagamentos: Mercado Pago (ativo), Asaas (configurável)

## 3) Regras essenciais de multi-tenant

- O tenant é resolvido por subdomínio quando disponível.
- Em localhost/dev, o backend aceita `X-Barbearia-Slug`.
- Se não houver subdomínio/header, usa `DEFAULT_BARBEARIA_SLUG` quando configurado.
- Toda query de negócio deve filtrar por `barbearia_id`.
- Nunca retornar dados cruzando tenants.

Exceções no tenant guard (sem slug obrigatório):

- `GET /health`
- `POST /mercadopago/webhook`
- rotas `/master` e `/auth/master`

## 4) Padrões de API

- Sucesso: `{ "success": true, "data": ... }`
- Erro: `{ "success": false, "error": "mensagem", ... }`
- Autenticação por Bearer JWT nas rotas privadas.

Endpoints e agrupamentos atualizados estão em `API_SPEC.md`.

## 5) Módulos de backend (registrados)

- `auth`
- `barbearia`
- `clientes`
- `clientes_assinaturas`
- `categorias`
- `profissionais`
- `servicos`
- `agendamentos`
- `horarios`
- `dashboard`
- `financeiro`
- `notifications`
- `master`
- `master_settings`
- `mercadopago`

Observação: `backend/routes/stripe.py` existe, porém não está registrado em `backend/routes/__init__.py`.

## 6) Organização do repositório

- `backend/routes`: endpoints HTTP por domínio
- `backend/repositories`: acesso a dados
- `backend/services`: regras de negócio e integrações
- `backend/scripts`: jobs e workers
- `backend/tests`: testes backend
- `services`: clientes frontend para API
- `http.test`: cenários de teste manual

## 7) Agenda e disponibilidade

- disponibilidade calculada por serviço/profissional/horários/bloqueios
- operações públicas e privadas de agendamento coexistem
- controle de status e auditoria via tabelas específicas

## 8) Notificações

Arquitetura:

- API enfileira dispatches em tabela
- worker (`backend/scripts/notifications_worker.py`) processa `QUEUED`/`RETRYING`
- suporte a reenvio manual por endpoint interno

Endpoints internos principais:

- `/internal/notifications/test-whatsapp`
- `/internal/notifications/test-email`
- `/internal/notifications/dispatches`
- `/internal/notifications/dispatches/<dispatch_id>/retry`

## 9) Banco e migrações

- Fonte primária do schema: arquivos SQL em `backend/migrations`
- Cobertura atual: módulos `001` a `028`
- Entidades e relações resumidas em `DATABASE_SCHEMA.md`

## 10) Diretrizes para alterações de código por IA

- preservar isolamento por tenant em toda alteração
- não introduzir hardcode de credenciais/segredos
- manter padrão de resposta HTTP (`success/data` e `success/error`)
- priorizar mudanças pequenas e localizadas
- alinhar documentação quando mudar contrato de API/schema

## 11) Checklist mínimo antes de entregar mudanças

- endpoint novo aparece em `API_SPEC.md`?
- mudança de tabela/campo aparece em `DATABASE_SCHEMA.md`?
- impacto operacional foi refletido no `README.md`?
- configuração nova foi adicionada ao `backend/.env.example`?