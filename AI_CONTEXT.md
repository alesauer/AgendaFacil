# AI Context — AgendaFácil

Este arquivo descreve o contexto completo do sistema AgendaFácil para auxiliar ferramentas de IA a gerar código consistente com a arquitetura do projeto.

Este documento deve ser considerado **a principal fonte de contexto para geração de código**.

---

# Sobre o Produto

AgendaFácil é um SaaS de gestão de barbearias que permite:

- agendamento online
- gestão de profissionais
- gestão de serviços
- CRM de clientes
- dashboard financeiro
- notificações automáticas
- integração WhatsApp
- cobrança recorrente

Cada barbearia possui um ambiente isolado dentro da plataforma.

Exemplo:

joaobarber.agendafacil.com  
centralbarber.agendafacil.com

---

# Arquitetura

Frontend

React + TypeScript

Backend

Python + Flask

Banco

Supabase PostgreSQL

Infraestrutura

Nginx  
Gunicorn  
Redis  
Celery

Integrações

Stripe Billing  
Baileys WhatsApp

---

# Multi-Tenant

O sistema é multi-tenant por subdomínio.

Exemplo:

joaobarber.agendafacil.com

O backend identifica a barbearia pelo subdomínio.

Exemplo:

host = request.host  
subdomain = host.split('.')[0]

Esse valor corresponde ao campo `slug` da tabela `barbearias`.

Todas as queries devem obrigatoriamente incluir:

barbearia_id

Nunca retornar dados sem filtrar por barbearia_id.

---

# Modelo da Agenda

A agenda utiliza intervalos base de 15 minutos.

Slots:

09:00  
09:15  
09:30  
09:45  

A disponibilidade deve considerar:

- horário de funcionamento
- duração do serviço
- agenda do profissional
- bloqueios
- agendamentos existentes

Regra de conflito:

slot_start < existing_end  
AND  
slot_end > existing_start

Constraint obrigatória:

UNIQUE(profissional_id, data, hora_inicio)

---

# Estrutura do Banco

Tabelas principais:

barbearias  
usuarios  
profissionais  
clientes  
categorias  
servicos  
agendamentos  
bloqueios  
horarios_funcionamento  
config_agenda  
config_notificacoes  
whatsapp_sessions  
assinaturas  
mensagens  

Todas possuem barbearia_id.

---

# Estrutura Backend

backend/

app.py  
config.py  

routes/

auth.py  
clientes.py  
profissionais.py  
servicos.py  
agendamentos.py  

models/

barbearia.py  
cliente.py  
profissional.py  
servico.py  
agendamento.py  

services/

agenda_service.py  
stripe_service.py  
whatsapp_service.py  

middleware/

tenant.py  
auth.py  

---

# Estrutura Frontend

frontend/

components/  
pages/  
services/  
hooks/  
contexts/  
locales/  

---

# Padrões de API

Endpoints seguem padrão REST.

Exemplo:

GET /clientes  
POST /clientes  
PUT /clientes/:id  
DELETE /clientes/:id  

Respostas da API devem seguir padrão:

success response:

{
 "success": true,
 "data": {}
}

error response:

{
 "success": false,
 "error": "mensagem"
}

---

# Segurança

Todas as rotas privadas devem exigir autenticação JWT.

O token deve incluir:

user_id  
barbearia_id  
role  

Nunca confiar no frontend para determinar a barbearia.

Sempre usar o middleware tenant.

---

# Fluxo de Onboarding

Landing Page  
↓  
Escolher plano  
↓  
Criar conta  
↓  
Stripe Checkout  
↓  
Pagamento aprovado  
↓  
Onboarding Wizard  
↓  
Configuração da barbearia  
↓  
Dashboard  

---

# Wizard de Configuração

Passo 1  
Dados da barbearia

Passo 2  
Adicionar profissionais

Passo 3  
Adicionar serviços

Passo 4  
Horário de funcionamento

Passo 5  
Conectar WhatsApp

Tempo esperado: 2 minutos.

---

# Notificações

Tipos:

confirmação de agendamento  
lembrete de agendamento  
cancelamento  

Podem ser enviadas por:

WhatsApp  
Email

---

# Integração WhatsApp

A integração utiliza Baileys.

Fluxo:

Configurações  
↓  
Conectar WhatsApp  
↓  
Gerar QR Code  
↓  
Escanear com celular  
↓  
Sessão ativa

---

# Assinaturas

Sistema usa Stripe Billing.

Fluxo:

Escolher plano  
↓  
Checkout Stripe  
↓  
Webhook  
↓  
Criar assinatura  
↓  
Liberar acesso

Se assinatura estiver inativa, bloquear acesso ao sistema.

---

# Internacionalização

Frontend preparado para múltiplos idiomas.

Biblioteca:

react-i18next

Idiomas planejados:

pt-BR  
en  
es  

Idioma padrão:

Português

---

# Escalabilidade

O sistema deve suportar:

- milhares de barbearias
- milhares de agendamentos por dia

Para isso:

usar Redis para cache  
usar Celery para tarefas assíncronas  
usar Gunicorn com múltiplos workers

---

# Objetivo do Projeto

Criar uma plataforma SaaS escalável para gestão de barbearias com foco em:

- simplicidade
- automação
- experiência do cliente
- expansão internacional