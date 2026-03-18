# Especificação da API

## Auth

POST /auth/signup  
POST /auth/login  
GET /auth/me  

## Profissionais

GET /profissionais  
POST /profissionais  
PUT /profissionais/:id  
DELETE /profissionais/:id  

### Campos de profissionais

- nome
- cargo
- telefone
- foto_url
- comissao_percentual
- ativo

## Serviços

GET /servicos  
POST /servicos  
PUT /servicos/:id  
DELETE /servicos/:id  

## Categorias

GET /categorias  
POST /categorias  
PUT /categorias/:id  
DELETE /categorias/:id  

## Clientes

GET /clientes  
POST /clientes  
PUT /clientes/:id  
DELETE /clientes/:id  

## Agenda

GET /agenda/disponibilidade  
POST /agendamentos  
GET /agendamentos  
DELETE /agendamentos/:id  

## Dashboard

GET /dashboard/metricas

## Barbearia / Identidade

GET /barbearia/identidade  
PUT /barbearia/identidade  
GET /barbearia/identidade-publica

### Campos de identidade

- nome
- logo_url
- login_logo_url
- login_background_url
- icone_marca
- cor_primaria
- cor_secundaria