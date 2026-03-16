<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

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
