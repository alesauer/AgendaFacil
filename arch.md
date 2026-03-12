# Arquitetura do Sistema

Internet
↓
Nginx
↓
Gunicorn (Flask Workers)
↓
Flask API
↓
Supabase PostgreSQL
↓
Redis
↓
Celery Workers
↓
Integrações externas

## Serviços

Frontend → React
Backend → Flask
Database → PostgreSQL
Cache → Redis
Fila → Celery
Payments → Stripe
WhatsApp → Baileys