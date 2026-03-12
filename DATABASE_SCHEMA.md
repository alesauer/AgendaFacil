# Database Schema

## barbearias

id  
nome  
slug  
telefone  
cidade  
created_at  

## usuarios

id  
barbearia_id  
nome  
telefone  
senha_hash  
role  
ativo  

## profissionais

id  
barbearia_id  
nome  
cargo  
telefone  
foto_url  
ativo  

## clientes

id  
barbearia_id  
nome  
telefone  
data_nascimento  

## categorias

id  
barbearia_id  
nome  
descricao  

## servicos

id  
barbearia_id  
categoria_id  
nome  
duracao_min  
preco  

## agendamentos

id  
barbearia_id  
cliente_id  
profissional_id  
servico_id  
data  
hora_inicio  
hora_fim  
status  

## bloqueios

id  
barbearia_id  
profissional_id  
data  
hora_inicio  
hora_fim  
motivo