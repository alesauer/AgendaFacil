flask run --debug --host 0.0.0.0 --port 5000
npm run dev
python3 scripts/notifications_worker.py --limit 50 --poll-seconds 10



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