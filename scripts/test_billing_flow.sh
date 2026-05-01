#!/usr/bin/env bash
# ============================================================================
# Teste do Fluxo Completo de Billing
# ============================================================================
# 1. Provisiona uma nova barbearia (via master)
# 2. Login do admin → dispara trial de 7 dias (assinatura_status = 'TRIAL')
# 3. Verifica assinatura com trial ativo
# 4. Gera checkout Asaas (simula cobrança)
# ============================================================================
# Uso: ./scripts/test_billing_flow.sh [slug_opcional]
# ============================================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5000}"
MASTER_LOGIN="${MASTER_LOGIN:-master}"
MASTER_PASSWORD="${MASTER_PASSWORD:-admin123}"

# Identificador único para este teste
TS=$(date +%s)
SLUG="${1:-teste-asaas-${TS}}"
TENANT_NOME="Barbearia Teste Asaas ${TS}"
ADMIN_NOME="Admin Teste"
ADMIN_TEL="3199999${TS: -4}"
ADMIN_EMAIL="admin-${TS}@teste.com"
ADMIN_SENHA="teste123"
# CPF válido do sandbox Asaas (configurado em ASAAS_SANDBOX_CUSTOMER_CPF_CNPJ)
CPF_CNPJ="03854079630"

echo "========================================"
echo "🧪 Teste do Fluxo Completo de Billing"
echo "========================================"
echo ""
echo "🔧 Parâmetros:"
echo "   Slug:       ${SLUG}"
echo "   Admin:      ${ADMIN_TEL} / ${ADMIN_EMAIL}"
echo "   CPF/CNPJ:   ${CPF_CNPJ}"
echo ""

# --------------------------------------------------
# Step 1: Login como Master
# --------------------------------------------------
echo "▶️  Step 1/6: Login como Master..."
MASTER_RESP=$(curl -s -X POST "${BASE_URL}/auth/master/login" \
  -H "Content-Type: application/json" \
  -d "{\"login\": \"${MASTER_LOGIN}\", \"senha\": \"${MASTER_PASSWORD}\"}")

MASTER_TOKEN=$(echo "$MASTER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null || echo "")
if [ -z "$MASTER_TOKEN" ]; then
  echo "❌ Falha no login Master. Resposta:"
  echo "$MASTER_RESP" | python3 -m json.tool 2>/dev/null || echo "$MASTER_RESP"
  exit 1
fi
echo "✅ Master autenticado"
echo ""

# --------------------------------------------------
# Step 2: Provisionar nova barbearia
# --------------------------------------------------
echo "▶️  Step 2/6: Provisionando nova barbearia..."
PROV_RESP=$(curl -s -X POST "${BASE_URL}/master/lab/provision" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" \
  -d "{
    \"tenant_nome\": \"${TENANT_NOME}\",
    \"tenant_slug\": \"${SLUG}\",
    \"tenant_telefone\": \"${ADMIN_TEL}\",
    \"admin_nome\": \"${ADMIN_NOME}\",
    \"admin_telefone\": \"${ADMIN_TEL}\",
    \"admin_email\": \"${ADMIN_EMAIL}\",
    \"admin_senha\": \"${ADMIN_SENHA}\"
  }")

TENANT_ID=$(echo "$PROV_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(d.get('tenant',{}).get('id',''))" 2>/dev/null || echo "")
if [ -z "$TENANT_ID" ]; then
  echo "❌ Falha no provisionamento. Resposta:"
  echo "$PROV_RESP" | python3 -m json.tool 2>/dev/null || echo "$PROV_RESP"
  exit 1
fi
echo "✅ Barbearia criada: ${TENANT_ID}"
echo ""

# --------------------------------------------------
# Step 3: Login do admin → deve iniciar trial
# --------------------------------------------------
echo "▶️  Step 3/6: Login do admin (deve disparar TRIAL)..."
ADMIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Barbearia-Slug: ${SLUG}" \
  -d "{\"telefone\": \"${ADMIN_TEL}\", \"senha\": \"${ADMIN_SENHA}\"}")

ADMIN_TOKEN=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null || echo "")
USER_ROLE=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('user',{}).get('role',''))" 2>/dev/null || echo "")
if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Falha no login do admin. Resposta:"
  echo "$ADMIN_RESP" | python3 -m json.tool 2>/dev/null || echo "$ADMIN_RESP"
  exit 1
fi
echo "✅ Admin logado (role: ${USER_ROLE})"
echo ""

# --------------------------------------------------
# Step 4: Verificar assinatura — deve estar em TRIAL
# --------------------------------------------------
echo "▶️  Step 4/6: Verificando assinatura..."
SLEEP 1
ASSN_RESP=$(curl -s -X GET "${BASE_URL}/barbearia/assinatura" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Barbearia-Slug: ${SLUG}")

ASSN_STATUS=$(echo "$ASSN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('assinatura_status',''))" 2>/dev/null || echo "")
TRIAL_INFO=$(echo "$ASSN_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',{}).get('trial',{})
print(f\"Ativo={d.get('trial_ativo','')}|Fim={d.get('trial_fim','')}|Inicio={d.get('trial_inicio','')}\")
" 2>/dev/null || echo "")
PROVIDER=$(echo "$ASSN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('payment_provider',''))" 2>/dev/null || echo "")

echo "   Status assinatura:  ${ASSN_STATUS}"
echo "   Trial:              ${TRIAL_INFO}"
echo "   Payment provider:   ${PROVIDER}"
echo ""

if [ "${ASSN_STATUS}" != "TRIAL" ]; then
  echo "⚠️  Status inesperado. Detalhes:"
  echo "$ASSN_RESP" | python3 -m json.tool 2>/dev/null || echo "$ASSN_RESP"
fi

# --------------------------------------------------
# Step 5: Gerar checkout (simular cobrança pós-trial)
# --------------------------------------------------
echo "▶️  Step 5/6: Gerando checkout Asaas..."
CHECKOUT_RESP=$(curl -s -X POST "${BASE_URL}/barbearia/assinatura/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Barbearia-Slug: ${SLUG}" \
  -d '{
    "ciclo_cobranca": "MONTHLY",
    "plano_tier": "PROFISSIONAL",
    "cpf_cnpj": "08495376080"
  }')

CHECKOUT_URL=$(echo "$CHECKOUT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('checkout_url',''))" 2>/dev/null || echo "")
CHECKOUT_ID=$(echo "$CHECKOUT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('subscription_id',''))" 2>/dev/null || echo "")
ASSAAS_ID=$(echo "$CHECKOUT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('asaas_subscription_id',''))" 2>/dev/null || echo "")

if [ -n "$CHECKOUT_URL" ]; then
  echo "✅ Checkout gerado!"
  echo "   Subscription ID:   ${CHECKOUT_ID}"
  echo "   Asaas ID:          ${ASSAAS_ID}"
  echo "   URL:               ${CHECKOUT_URL}"
else
  echo "⚠️  Resposta do checkout:"
  echo "$CHECKOUT_RESP" | python3 -m json.tool 2>/dev/null || echo "$CHECKOUT_RESP"
fi
echo ""

# --------------------------------------------------
# Step 6: Verificar assinatura pós-checkout
# --------------------------------------------------
echo "▶️  Step 6/6: Verificando assinatura após checkout..."
ASSN2_RESP=$(curl -s -X GET "${BASE_URL}/barbearia/assinatura" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Barbearia-Slug: ${SLUG}")

ASSN2_STATUS=$(echo "$ASSN2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('assinatura_status',''))" 2>/dev/null || echo "")
ASSN2_PAYMENT=$(echo "$ASSN2_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(f\"Ciclo={d.get('ciclo_cobranca','')} | Provider={d.get('payment_provider','')}\")" 2>/dev/null || echo "")

echo "   Status assinatura:  ${ASSN2_STATUS}"
echo "   ${ASSN2_PAYMENT}"
echo ""

# --------------------------------------------------
# Resumo Final
# --------------------------------------------------
echo "========================================"
echo "📋 RESUMO DO TESTE"
echo "========================================"
echo "   Slug:          ${SLUG}"
echo "   Tenant ID:     ${TENANT_ID}"
echo "   Login tel:     ${ADMIN_TEL}"
echo "   Email:         ${ADMIN_EMAIL}"

if [ "${ASSN_STATUS}" = "TRIAL" ]; then
  echo " ✅ TRIAL:        Ativo (assinatura_status=TRIAL)"
  echo "   Informações:   ${TRIAL_INFO}"
else
  echo " ⚠️ TRIAL:        Status atual = ${ASSN_STATUS}"
fi

if [ -n "$CHECKOUT_URL" ]; then
  echo " ✅ CHECKOUT:     Link gerado com sucesso"
  echo "   Asaas ID:      ${ASSAAS_ID}"
else
  echo " ⚠️ CHECKOUT:     Falha ao gerar ou resposta inesperada"
fi
echo ""

echo "🔗 Link do checkout (abra no navegador para pagar):"
echo "   ${CHECKOUT_URL:-"(não gerado)"}"
echo ""
echo "========================================"
echo "✅ Teste concluído!"
echo "========================================"
