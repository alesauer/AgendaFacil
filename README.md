# AgendaFácil

Plataforma SaaS para gestão de barbearias com agenda, clientes, profissionais, financeiro, notificações e administração multi-tenant.

## Visão geral técnica

- Frontend: React + TypeScript + Vite
- Backend: Flask (Python) com CORS e autenticação JWT
- Banco: Supabase (modo de execução atual: `SUPABASE_ONLY=true`)
- Mensageria/notificações: Evolution (WhatsApp) + Resend (e-mail) + worker Python
- Pagamentos: Asaas (provider principal do SaaS da barbearia), Mercado Pago (legado/fallback transitório), Stripe (legado, fora do fluxo oficial)

## Estrutura do repositório

- `backend/`: API, middleware, repositórios, serviços, scripts, migrações
- `services/`: clientes HTTP do frontend para os módulos da API
- `views/`: telas principais do frontend
- `http.test/`: cenários de teste manual de API
- `docker-compose.yml` e `docker-compose.prod.yml`: execução local e produção

## Pré-requisitos

- Node.js 20+
- Python 3.11+
- Docker + Docker Compose plugin (opcional, mas recomendado)
- Projeto Supabase com acesso por `SUPABASE_URL` e `SUPABASE_KEY`

## Execução local (sem Docker)

### 1) Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
flask --app app run --host 0.0.0.0 --port 5000
```

### 2) Frontend

```bash
cd ..
npm install
cat > .env.local <<EOF
VITE_API_BASE_URL=http://127.0.0.1:5000
VITE_DEFAULT_TENANT_SLUG=demo
EOF
npm run dev
```

### 3) Healthcheck

- API: `GET http://127.0.0.1:5000/health`
- Frontend: `http://127.0.0.1:5173` (ou porta definida pelo Vite)

## Execução com Docker (local)

Stack padrão de 3 serviços:

- `frontend` em `http://localhost:3000`
- `backend` em `http://localhost:5000`
- `notifications-worker` (consumidor da fila de notificações)

```bash
cp backend/.env.example backend/.env
docker compose up --build -d
docker compose logs -f backend frontend notifications-worker
docker compose down
```

## Deploy (GHCR + VPS)

Fluxo previsto:

1. Build de imagens `backend` e `frontend`
2. Push para GHCR
3. Pull e `up -d` no VPS com `docker-compose.prod.yml`

Variáveis/secrets esperados no GitHub Actions:

- `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_APP_DIR`
- `GHCR_USERNAME`, `GHCR_TOKEN`

## Banco e migrações

As migrações ficam em `backend/migrations` e devem ser executadas em ordem numérica (`001` até `028`, incluindo os arquivos `seed` quando necessário).

Módulos principais cobertos pelas migrações atuais:

- base SaaS e entidades core
- agenda e horários de funcionamento
- identidade visual e usuários
- financeiro
- notificações e fila de dispatch
- permissões de colaboradores
- configuração runtime do master
- assinaturas B2C de clientes
- leads/onboarding

Referências:

- `DATABASE_SCHEMA.md`
- `API_SPEC.md`

## Variáveis de ambiente

### Backend

Use `backend/.env.example` como catálogo de variáveis.

Blocos críticos:

- Supabase: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_NETWORK_MODE`
- Tenant default local: `DEFAULT_BARBEARIA_SLUG`
- Auth/master: `SECRET_KEY`, `MASTER_LOGIN`, `MASTER_PASSWORD`
- Notificações: `EVOLUTION_*`, `RESEND_*`, `EMAIL_*`
- Pagamentos SaaS: `PAYMENT_PROVIDER=asaas`, `ASAAS_*` e, durante a transição, `MP_*` como fallback legado

### Frontend

- `VITE_API_BASE_URL`
- `VITE_DEFAULT_TENANT_SLUG`

## Notificações (worker)

Worker local:

```bash
cd backend
python3 scripts/notifications_worker.py --limit 50 --poll-seconds 10
```

Endpoints internos úteis (ADMIN):

- `POST /internal/notifications/test-whatsapp`
- `POST /internal/notifications/test-email`
- `GET /internal/notifications/dispatches`
- `POST /internal/notifications/dispatches/<dispatch_id>/retry`

## Testes e validação rápida

Frontend:

```bash
npm run lint
```

Backend (sanidade de execução):

- subir API e validar `/health`
- validar `GET /barbearia/assinatura`, `POST /barbearia/assinatura/checkout` e `POST /asaas/webhook`
- executar cenários em `http.test/`

## Multi-tenant e autenticação

- Tenant resolvido por subdomínio quando aplicável
- Em ambiente local, usar `X-Barbearia-Slug` (ou `DEFAULT_BARBEARIA_SLUG`)
- Quase todas as rotas de negócio exigem token JWT

## Documentação relacionada

- `API_SPEC.md`: endpoints por domínio
- `DATABASE_SCHEMA.md`: entidades/tabelas por módulo
- `arch.md`: arquitetura de runtime
- `especs.md`: especificações de produto e stack
- `AI_CONTEXT.md`: contexto operacional para assistentes de código
