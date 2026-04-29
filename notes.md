# Notes (internas)

Este arquivo reúne anotações operacionais e backlog rápido.

## Regras deste arquivo

- não registrar credenciais, tokens, senhas ou dados pessoais reais
- usar placeholders (`<TOKEN>`, `<EMAIL>`, `<TELEFONE>`)
- mover conteúdo oficial para documentos de referência (`README.md`, `API_SPEC.md`, `DATABASE_SCHEMA.md`)

## Playbook rápido — Notificações assíncronas

### 1) Subir backend

```bash
cd /var/www/html/agendafacil/AgendaFacil/backend
python3 -m venv .venv
source .venv/bin/activate
flask --app app run --host 0.0.0.0 --port 5000
```

### 2) Subir worker

```bash
cd /var/www/html/agendafacil/AgendaFacil/backend
source .venv/bin/activate
python3 scripts/notifications_worker.py --limit 50 --poll-seconds 10
```

### 3) Gerar token (exemplo)

```bash
curl -X POST http://127.0.0.1:5000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Barbearia-Slug: demo" \
  -d '{"telefone":"<TELEFONE>","senha":"<SENHA>"}'
```

## Pendências de produto/UX

- agenda (visão diária): revisar rolagem inicial baseada no horário atual
- menu lateral: garantir visibilidade contínua do link de saída em telas longas

## Ideias de infraestrutura (rascunho)

- mapear arquitetura-alvo por ambientes (dev/staging/prod)
- consolidar runbook de incidentes e rollback
- documentar domínios e roteamento externo em doc oficial de deploy

## Observações

- Para webhooks de pagamento ativos, usar documentação oficial de `mercadopago` no projeto.
- Se houver reativação de Stripe, alinhar registro de rota no app antes de divulgar playbook.
