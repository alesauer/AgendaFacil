# Arquitetura do Sistema

## Runtime principal (estado atual)

Internet  
↓  
Nginx (container do frontend)  
↓  
Frontend React/Vite  
↓ (`/api`)  
Flask API (Gunicorn em produção)  
↓  
Supabase (PostgreSQL + APIs)  
↓  
Worker Python de notificações (`notifications_worker.py`)  
↓  
Integrações externas (Evolution, Resend, Mercado Pago, Asaas)

## Componentes

- Frontend: React 19 + TypeScript + Vite
- Backend: Flask 3 + blueprints por domínio
- Banco: Supabase (`SUPABASE_ONLY=true`)
- Multi-tenant: resolução por subdomínio/`X-Barbearia-Slug`
- Notificações: fila em tabela (`notification_dispatches`) + worker polling
- Pagamentos:
	- ativo: Mercado Pago (`/mercadopago/webhook`)
	- configurável: Asaas (via variáveis e serviços)
	- legado/inativo no registro atual: Stripe (`backend/routes/stripe.py`)

## Execução em containers

- `backend`: API Flask
- `frontend`: build Vite servido por Nginx
- `notifications-worker`: consumidor da fila de notificações

## Segurança e borda

- CORS controlado para origens de frontend local configuradas na API
- JWT para rotas privadas
- Separação por tenant aplicada antes do processamento das rotas de negócio