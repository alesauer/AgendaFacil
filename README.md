
# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c70d021a-d973-4e92-9972-78af002489b3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Docker (frontend + backend)

Estratégia recomendada: **3 containers**.

- `frontend` (Vite build + Nginx) exposto em `http://localhost:3000`
- `backend` (Flask + Gunicorn) exposto em `http://localhost:5000`
- `notifications-worker` (fila assíncrona)

O frontend usa proxy interno (`/api`) para o backend no Docker network.

Observação: o build do frontend no Docker já aplica `legacy-peer-deps` (`npm ci --legacy-peer-deps`).

### 1) Pré-requisitos

- Docker
- Docker Compose plugin
- Arquivo `backend/.env` configurado (pode copiar de `backend/.env.example`)

### 2) Subir stack principal

```bash
docker compose up --build -d
```

### 3) Acessos

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/health`

### 4) Logs

```bash
docker compose logs -f backend frontend
```

### 5) Parar tudo

```bash
docker compose down
```

## Deploy no VPS Hostinger com GitHub Actions

Fluxo recomendado: GitHub Actions faz build das imagens, publica no GHCR e faz deploy via SSH no VPS.

### Arquivos usados

- `.github/workflows/deploy-hostinger.yml`
- `docker-compose.prod.yml`

### 1) Preparar VPS (uma vez)

No VPS, clone o repositório e mantenha `backend/.env` com as variáveis de produção:

```bash
mkdir -p /opt/agendafacil
cd /opt/agendafacil
git clone <URL_DO_REPO> .
cp backend/.env.example backend/.env  # se existir
```

Preencha `backend/.env` com credenciais reais (Supabase, Evolution, Resend, Stripe etc).

### 2) Secrets no GitHub (Settings > Secrets and variables > Actions)

- `VPS_HOST` (IP ou domínio do VPS)
- `VPS_PORT` (geralmente `22`)
- `VPS_USER` (usuário SSH)
- `VPS_SSH_KEY` (chave privada para acesso SSH)
- `VPS_APP_DIR` (ex.: `/opt/agendafacil`)
- `GHCR_USERNAME` (seu usuário/org do GitHub com acesso ao pacote)
- `GHCR_TOKEN` (PAT com escopo `read:packages`)

### 3) Como dispara

- Push na branch `main`, ou
- Execução manual em **Actions > Deploy Hostinger VPS > Run workflow**

### 4) O que o workflow faz

1. Builda imagens `backend` e `frontend`
2. Publica no `ghcr.io`
3. Acessa VPS por SSH
4. Executa `docker compose -f docker-compose.prod.yml pull && up -d`


## Backend (Flask + PostgreSQL/Supabase)

1. Entre na pasta backend:
   `cd backend`
2. Crie ambiente virtual Python:
   `python3 -m venv .venv`
3. Ative o ambiente:
   `source .venv/bin/activate`
4. Instale dependências:
   `pip install -r requirements.txt`
5. Copie e ajuste variáveis:
   `cp .env.example .env`
6. Rode a API:
   `flask --app app run --host 0.0.0.0 --port 5000`

Se seu ambiente usa `HTTP_PROXY/HTTPS_PROXY` e aparecer `Connection refused` ao acessar o Supabase, mantenha `BYPASS_PROXY_FOR_SUPABASE=true` e `DISABLE_SYSTEM_PROXY_FOR_SUPABASE=true` no `backend/.env`.

### Script de carga de agendamentos (teste)

Gera agendamentos aleatórios sem conflito para a barbearia atual (janela padrão: 7 dias atrás e 7 dias à frente).

```bash
cd backend
python3 scripts/generate_agendamentos_load.py --target 900 --dry-run
python3 scripts/generate_agendamentos_load.py --target 900
```

Parâmetros úteis:

- `--slug demo` ou `--barbearia-id <uuid>` para escolher tenant explicitamente
- `--window-days 7` para definir a janela para trás/frente
- `--seed 20260319` para geração reproduzível
- `--step-min 15` para granularidade dos horários

## Notifications (MVP provider-agnostic + Evolution)

Antes de usar, execute a migration abaixo no Supabase SQL Editor:

- `backend/migrations/013_module13_notifications_core.sql`
- `backend/migrations/014_module14_notifications_queue_ops.sql`

Depois configure no `backend/.env`:

- `EVOLUTION_API_BASE_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_API_KEY_HEADER` (default: `apikey`)
- `EVOLUTION_INSTANCE`
- `EVOLUTION_SEND_TEXT_PATH` (default: `/message/sendText/{instance}`)
- `RESEND_API_KEY`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME` (default: `AgendaFácil`)

Endpoint interno de teste (somente ADMIN autenticado, modo assíncrono: apenas enfileira):

```bash
curl -X POST http://localhost:5000/internal/notifications/test-whatsapp \
   -H "Authorization: Bearer <TOKEN_ADMIN>" \
   -H "X-Barbearia-Slug: demo" \
   -H "Content-Type: application/json" \
   -d '{
      "to": "11999999999",
      "template_key": "TEST_NOTIFICATION",
      "variables": {"message": "Teste de integração Evolution"}
   }'
```

Endpoint interno de teste de e-mail (somente ADMIN autenticado):

```bash
curl -X POST http://localhost:5000/internal/notifications/test-email \
   -H "Authorization: Bearer <TOKEN_ADMIN>" \
   -H "X-Barbearia-Slug: demo" \
   -H "Content-Type: application/json" \
   -d '{
      "to": "cliente@exemplo.com",
      "template_key": "TEST_NOTIFICATION",
      "variables": {
        "subject": "Teste Resend",
        "text": "Teste de integração email AgendaFácil"
      }
   }'
```

Worker da fila (processa `QUEUED` e `RETRYING`):

```bash
cd backend
python3 scripts/notifications_worker.py --once --limit 50
python3 scripts/notifications_worker.py --limit 50 --poll-seconds 10
```

### Troubleshooting WhatsApp (Evolution)

Para evitar inconsistência de ambiente, execute backend e worker sempre com o Python do venv:

```bash
cd /var/www/html/agendafacil/AgendaFacil
backend/venv/bin/python -m backend.app
```

```bash
cd /var/www/html/agendafacil/AgendaFacil/backend
../backend/venv/bin/python scripts/notifications_worker.py --limit 50 --poll-seconds 10
```

Checklist mínimo de configuração em `backend/.env`:

- `EVOLUTION_API_BASE_URL`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_API_KEY`
- `EVOLUTION_API_KEY_HEADER` (ex.: `apikey`)
- `NO_PROXY` incluindo host interno da Evolution quando necessário

Teste ponta a ponta (enqueue + polling do dispatch):

```bash
set -e
BASE="http://127.0.0.1:5000"
TENANT="demo"
PHONE="11999999999"
PASS="admin123"
TO="31995041815"

TOKEN=$(curl -sS -X POST "$BASE/auth/login" \
   -H "Content-Type: application/json" \
   -H "X-Barbearia-Slug: $TENANT" \
   -d "{\"telefone\":\"$PHONE\",\"senha\":\"$PASS\"}" \
   | python3 -c 'import sys,json; print((json.load(sys.stdin).get("data") or {}).get("token") or "")')

ENQUEUE=$(curl -sS -X POST "$BASE/internal/notifications/test-whatsapp" \
   -H "Authorization: Bearer $TOKEN" \
   -H "X-Barbearia-Slug: $TENANT" \
   -H "Content-Type: application/json" \
   -d "{\"to\":\"$TO\",\"template_key\":\"TEST_NOTIFICATION\",\"variables\":{\"message\":\"Teste WhatsApp async\"}}")

DISPATCH_ID=$(echo "$ENQUEUE" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("data") or {}).get("dispatch_id") or "")')
echo "DISPATCH_ID=$DISPATCH_ID"

for i in $(seq 1 20); do
   LINE=$(curl -sS "$BASE/internal/notifications/dispatches?limit=150" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Barbearia-Slug: $TENANT" \
      | python3 -c 'import sys,json; d=json.load(sys.stdin).get("data") or []; t=sys.argv[1]; r=next((x for x in d if x.get("id")==t), {}); print("{}|{}|{}|{}".format(r.get("status"), r.get("attempts"), r.get("error_code"), r.get("error_message")))' "$DISPATCH_ID")
   echo "[$i] $LINE"
   STATUS=$(echo "$LINE" | cut -d'|' -f1)
   if [ "$STATUS" = "SENT" ] || [ "$STATUS" = "FAILED" ]; then
      break
   fi
   sleep 2
done
```

## Configurações globais no MASTER (proxy/e-mail/whatsapp/pagamentos)

Para habilitar a nova área **Configurações Globais** no painel MASTER, execute também:

- `backend/migrations/024_module24_master_runtime_config.sql`

Opcional no `backend/.env` (recomendado em produção):

- `MASTER_CONFIG_ENCRYPTION_KEY` (Fernet key URL-safe base64, 32 bytes)
- `MASTER_RUNTIME_CONFIG_CACHE_SECONDS` (default: `30`)

Sem `MASTER_CONFIG_ENCRYPTION_KEY`, o sistema deriva uma chave a partir de `SECRET_KEY`.

## Assinaturas B2C (clientes da barbearia)

Para habilitar planos/assinaturas B2C e consumo automático de franquia ao concluir financeiro, execute:

- `backend/migrations/025_module25_clientes_assinaturas_b2c.sql`

Job de lembrete D-1:

```bash
cd backend
python3 scripts/notifications_reminder_job.py --slug demo
```

Endpoints internos (somente ADMIN):

- `GET /internal/notifications/dispatches?status=FAILED&limit=100`
- `POST /internal/notifications/dispatches/<dispatch_id>/retry`
- `POST /internal/notifications/test-whatsapp`
- `POST /internal/notifications/test-email`

### Variáveis frontend para API

Crie `.env.local` na raiz com:

`VITE_API_BASE_URL=http://127.0.0.1:5000`

`VITE_DEFAULT_TENANT_SLUG=demo`

## Módulo 1 (Supabase Cloud)

### 1) Criar schema base

No SQL Editor do Supabase, execute nesta ordem:

- `backend/migrations/001_module1_base_saas.sql`
- `backend/migrations/001_module1_seed_demo.sql`
- `backend/migrations/002_module2_core_entities.sql`
- `backend/migrations/002_module2_seed_demo.sql`
- `backend/migrations/003_module3_core_agenda.sql`
- `backend/migrations/003_module3_seed_agendamentos_demo.sql`
- `backend/migrations/004_module4_horarios_funcionamento.sql`
- `backend/migrations/005_module5_identidade_visual.sql`
- `backend/migrations/006_module6_usuarios_email.sql`
- `backend/migrations/007_module7_agenda_financeiro.sql`
- `backend/migrations/008_module8_clientes_email.sql`
- `backend/migrations/009_module9_no_show_status.sql`
- `backend/migrations/010_module10_financeiro_core.sql`
- `backend/migrations/011_module11_login_brand_assets.sql`
- `backend/migrations/012_module12_profissionais_comissao.sql`
- `backend/migrations/013_module13_notifications_core.sql`
- `backend/migrations/014_module14_notifications_queue_ops.sql`
- `backend/migrations/025_module25_clientes_assinaturas_b2c.sql`

### 2) Subir backend Flask

Configure `backend/.env` com `SUPABASE_URL` e `SUPABASE_KEY` e rode a API.
O backend está em modo Supabase-only por código, então `DATABASE_URL` local é ignorada.

### 3) Criar primeiro admin da barbearia demo

Use o endpoint de signup enviando o slug do tenant no header:

```bash
curl -X POST http://localhost:5000/auth/signup \
   -H "Content-Type: application/json" \
   -H "X-Barbearia-Slug: demo" \
   -d '{"nome":"Admin Demo","telefone":"11999999999","senha":"admin123","role":"ADMIN"}'
```

### 4) Login

```bash
curl -X POST http://localhost:5000/auth/login \
   -H "Content-Type: application/json" \
   -H "X-Barbearia-Slug: demo" \
   -d '{"telefone":"11999999999","senha":"admin123"}'
```
