# AgendaFácil — Especificações do Sistema

AgendaFácil é um SaaS de gestão de barbearias com foco em operação diária, produtividade e recorrência.

## Escopo funcional atual

- agenda (interna e pública)
- cadastro e gestão de profissionais
- catálogo de serviços e categorias
- CRM de clientes
- financeiro (recebíveis, pagamentos e estornos)
- notificações automáticas (WhatsApp e e-mail)
- gestão de assinaturas B2C de clientes
- módulo master para governança de tenants

## Tecnologias em uso

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Recharts

### Backend

- Python 3
- Flask 3
- PyJWT
- Supabase SDK
- Requests

### Infraestrutura

- Docker / Docker Compose
- Gunicorn (produção)
- Nginx (entrega do frontend)

### Banco

- Supabase PostgreSQL (multi-tenant por `barbearia_id`)

## Integrações externas

- Evolution API (WhatsApp)
- Resend (e-mail transacional)
- Mercado Pago (webhook e cobrança)
- Asaas (suporte configurável)

## Princípios de arquitetura

- backend orientado a módulos por domínio
- tenant obrigatório em todas as operações de negócio
- filas de notificação persistidas em banco com worker assíncrono
- API JSON padronizada em `success/data` e `success/error`

## Estado de compatibilidade

- existem artefatos legados de Stripe no backend, porém o registro ativo de webhook no app atual é de Mercado Pago.