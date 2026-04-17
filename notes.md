## Playbook WhatsApp (assíncrono)

### 1) Subir backend (venv)
```bash
cd /var/www/html/agendafacil/AgendaFacil
backend/venv/bin/python -m backend.app
```

### 2) Subir worker (venv)
```bash
cd /var/www/html/agendafacil/AgendaFacil/backend
../backend/venv/bin/python scripts/notifications_worker.py --limit 50 --poll-seconds 10
```

### 3) Teste ponta a ponta (enqueue + polling)
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

### 4) Config validada no ambiente
- EVOLUTION_API_BASE_URL=http://gac.almg.uucp:8082
- EVOLUTION_INSTANCE=TesteSauer
- EVOLUTION_API_KEY_HEADER=apikey
- NO_PROXY=gac.almg.uucp,localhost,127.0.0.1,::1,wsl.localhost



Em Agenda:
- Na visualização por Dia, rolar a barra de rolagem baseado no horáio atual.

Manter o menu lateral especialmente a pare de Baizo onde tem o link de sair sempre visível. Em telas que crescem o botão fica oculto.


---
Gerar token auth
TOKEN=$(curl -s -X POST http://127.0.0.1:5000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Barbearia-Slug: demo" \
  -d '{"telefone":"11999999999","senha":"admin123"}' | jq -r '.data.token')
echo "$TOKEN"


api resend: re_2sSscbka_JhmYkU5baN6Fn9xVtrWmEHWK


#stripe
stripe listen --forward-to http://127.0.0.1:5000/stripe/webhook


----
Cria barbearia

curl -X POST http://127.0.0.1:5000/auth/signup -H "Content-Type: application/json" -H "X-Barbearia-Slug: demo2" -d '{"nome":"Admin Demo2","telefone":"11911111111","senha":"admin123","role":"ADMIN"}


users:
demo1
11911111111 / admin123



                    🌐 Internet
                         ↓
        ┌──────────────────────────────────┐
        │  Cloudflare (DNS + CDN + SSL)   │
        └──────────────────────────────────┘
                         ↓
        ┌──────────────────────────────────┐
        │     Vercel (Landing Page)       │
        └──────────────────────────────────┘
                         ↓
                 barbeiros.app
                         ↓
════════════════════════════════════════════════════

                🖥️ VPS 1 (CORE)
        ┌──────────────────────────────────┐
        │ Traefik (reverse proxy + HTTPS) │
        ├──────────────────────────────────┤
        │ Frontend (React + Nginx)        │
        ├──────────────────────────────────┤
        │ Flask API (Gunicorn workers)    │
        ├──────────────────────────────────┤
        │ Portainer (gestão Docker)       │
        └──────────────────────────────────┘
                         ↓
        ┌──────────────────────────────────┐
        │   Supabase (PostgreSQL + Auth)  │
        └──────────────────────────────────┘
                         ↓
════════════════════════════════════════════════════

            ⚙️ VPS 2 (FILA / WORKERS)
        ┌──────────────────────────────────┐
        │ Redis (fila central)            │
        ├──────────────────────────────────┤
        │ Worker 1 (notificações)         │
        ├──────────────────────────────────┤
        │ Worker 2 (tarefas async)        │
        ├──────────────────────────────────┤
        │ Scheduler (jobs agendados)      │
        └──────────────────────────────────┘
                         ↓
════════════════════════════════════════════════════

           📲 VPS 3 (NOTIFICAÇÕES)
        ┌──────────────────────────────────┐
        │ Evolution API (WhatsApp)        │
        ├──────────────────────────────────┤
        │ Worker envio (opcional)         │
        └──────────────────────────────────┘
                         ↓
════════════════════════════════════════════════════

        📡 Serviços Externos Integrados

   ┌───────────────┐     ┌───────────────┐
   │   Resend      │     │   Stripe      │
   │ (Email API)   │     │ (Pagamentos)  │
   └───────────────┘     └───────────────┘



barbeiros.app
├── www.barbeiros.app        → landing (Vercel)
├── app.barbeiros.app        → frontend SaaS
├── api.barbeiros.app        → backend Flask
├── webhooks.barbeiros.app   → Stripe/webhooks
├── wa.barbeiros.app         → Evolution API
├── portainer.barbeiros.app  → gestão containers
├── status.barbeiros.app     → monitoramento
└── staging.barbeiros.app    → ambiente teste



-----------
Prompt video:
Bem-vindo ao Barbeiros, a plataforma completa para gestão de barbearias.
Em menos de 2 minutos, você vai ver como o painel administrativo centraliza agenda, clientes, profissionais, financeiro e integrações em um único lugar.

Logo no início, o administrador acompanha os principais indicadores do negócio em tempo real.
Na agenda, os atendimentos ficam organizados por status, com mais controle da operação e melhor aproveitamento da equipe.

Um dos grandes diferenciais é a redução de não comparecimento dos clientes.
Com os avisos automáticos por WhatsApp, o cliente é lembrado um pouco antes do horário, confirma presença e chega mais preparado para o atendimento.
Resultado: menos horários ociosos, mais previsibilidade no faturamento e melhor taxa de ocupação da agenda.

Na gestão de serviços, você define preço, duração e categoria, além de ordenar a exibição para facilitar a escolha do cliente.
No módulo de profissionais, controla comissão, permissões e acesso ao sistema com total rastreabilidade.

No financeiro, a barbearia acompanha recebimentos e desempenho com visão clara para decisões rápidas e seguras.
E nas configurações, personaliza a identidade visual da sua barbearia e as regras de operação de acordo com o seu modelo de negócio.

O mais legal, o cliente também ganha autonomia com o app de agendamento.
Na prática, a sua barbearia fica na mão dos clientes: eles consultam horários, escolhem serviços e profissionais, e agendam com facilidade, direto do celular.

Com isso, você melhora a experiência do cliente, reduz falhas de comunicação e acelera o crescimento da operação.
Para começar agora, clique em “Começar teste grátis” e veja na prática como o Barbeiros irá transformar a gestão da sua barbearia