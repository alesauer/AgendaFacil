
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
