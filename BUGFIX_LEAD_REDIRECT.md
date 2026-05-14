# 🐛 Bug Fix: Lead Onboarding Redirect Loop

## Problema Original
Quando usuários clicavam no link do WhatsApp para lead onboarding (`app.barbeiros.app/#/lead-onboarding?lead_id=...`), o navegador redirecionava para `www.barbeiros.app` (site marketing) em vez de carregar o formulário de onboarding.

## Causa Raiz Identificada
A nginx estava reescrevendo a rota de requisição via `proxy_pass http://backend:5000/;` com trailing slash (`/` final).

Isso causava:
```
nginx: /api/leads/UUID → proxy rewrite → backend: /UUID
```

No backend Flask, o middleware `resolve_tenant()` estava verificando:
```python
if request.path.startswith("/api/leads") or request.path.startswith("/leads"):
    return None  # Permitir rota global
```

Como o path no backend era apenas `/UUID` (não `/api/leads`), o middleware **não reconhecia a rota como global**, continuava processando e tentava validar tenant:
- Não tinha slug válido → 404 "Barbearia não encontrada"
- Frontend capturava esse erro → redirecionava para www.barbeiros.app

## Solução Implementada
**Arquivo**: `docker/nginx.conf`

### Antes (Bugado)
```nginx
location /api/leads/ {
    proxy_pass http://backend:5000/;  # ❌ Reescreve para /UUID
}

location /api/master/ {
    proxy_pass http://backend:5000/;  # ❌ Reescreve para /UUID
}

location /api/ {
    proxy_pass http://backend:5000/;
}
```

### Depois (Corrigido)
```nginx
location ~ ^/api/leads(/|$) {
    proxy_pass http://backend:5000;  # ✅ Preserva /api/leads/UUID
    proxy_set_header X-Barbearia-Slug "";  # Rotas globais sem tenant
}

location ~ ^/api/master(/|$) {
    proxy_pass http://backend:5000;  # ✅ Preserva /api/master/...
    proxy_set_header X-Barbearia-Slug "";
}

location /api/ {
    proxy_pass http://backend:5000;  # Mantém outras rotas
}
```

### Mudanças Críticas
1. **Removido trailing slash** de `proxy_pass` (preserva path original)
2. **Mudado para regex location** `~ ^/api/leads(/|$)` para aceitar:
   - `/api/leads` (POST sem trailing slash)
   - `/api/leads/` (GET com trailing slash)
   - `/api/leads/{uuid}` (GET para lead específico)
3. **Aplicado para `/api/master` também**

## Fluxo Corrigido Agora
```
1. Frontend clica link: app.barbeiros.app/#/lead-onboarding?lead_id=UUID
2. nginx proxy_pass PRESERVA path: /api/leads/UUID
3. Backend recebe: /api/leads/UUID
4. Middleware reconhece: startswith("/api/leads") ✅
5. Retorna None (sucesso) - sem validar tenant
6. LeadOnboarding.tsx carrega lead e mostra formulário
7. SEM REDIRECIONAR para www.barbeiros.app ✨
```

## Verificações Realizadas
✅ POST `/api/leads` (criar lead) → 200 OK  
✅ GET `/api/leads/{uuid}` (buscar lead) → 200 OK + dados corretos  
✅ POST `/api/leads/{uuid}/track-click` → 200 OK  
✅ Lead sem tenant validation → Sucesso  
✅ Lead onboarding page carrega sem redirect  

## Commit
```
68e9c0b - Fix: nginx proxy_pass rewriting - remove trailing slash and use regex for leads/master routes
```

## Files Changed
- `docker/nginx.conf` - Nginx configuration for proxy_pass

## Impacto
- ✅ Resolve redirect loop ao lead onboarding
- ✅ Permite leads globais sem validação de tenant
- ✅ Mantém proteção do middleware para rotas normais
- ✅ POST e GET funcionam corretamente

## Aprendizado
⚠️ **nginx proxy_pass gotchas:**
- `proxy_pass http://backend:5000/;` → Reescreve (remove prefix)
- `proxy_pass http://backend:5000;` → Preserva path completo
- Usar regex location + sem `/` no final para máximo controle

