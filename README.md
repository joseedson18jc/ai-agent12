# ÓticaGestão — CRM para Óticas

Sistema completo de gestão para óticas brasileiras. Controle de clientes, vendas, estoque, financeiro, receitas ópticas e relatórios.

## Deploy com 1 Clique

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/joseedson18jc/ai-agent12&branch=claude/optical-shop-crm-XLbEP)

> Clique no botão acima, crie uma conta gratuita no Render, e o sistema será instalado automaticamente com banco de dados PostgreSQL.

## Credenciais de Acesso (Demo)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | `maria@oticagestao.com.br` | `admin123` |
| Vendedor | `joao@oticagestao.com.br` | `vendedor123` |

## Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Node.js + Express + Prisma ORM
- **Banco**: PostgreSQL 15
- **Auth**: JWT + bcrypt

## Deploy no Railway (Recomendado)

### 1. Criar conta no Railway
Acesse [railway.app](https://railway.app) e faça login com GitHub.

### 2. Criar novo projeto
- Clique em **"New Project"** → **"Deploy from GitHub Repo"**
- Selecione o repositório `joseedson18jc/ai-agent12`
- Branch: `claude/optical-shop-crm-XLbEP`

### 3. Adicionar PostgreSQL
- No projeto, clique em **"+ New"** → **"Database"** → **"PostgreSQL"**
- O Railway criará o banco e a variável `DATABASE_URL` automaticamente

### 4. Configurar variáveis de ambiente
No serviço do app, vá em **Variables** e adicione:

```
JWT_SECRET=sua-chave-secreta-forte-aqui
NODE_ENV=production
PORT=3001
```

A variável `DATABASE_URL` já é configurada automaticamente pelo Railway.

### 5. Deploy
O Railway detecta o `nixpacks.toml` e faz o build automaticamente:
- Instala dependências do frontend e backend
- Compila o frontend (Vite)
- Compila o backend (TypeScript)
- Copia o frontend para ser servido pelo backend
- Roda migrações do Prisma
- Inicia o servidor

### 6. Seed (dados iniciais)
Após o primeiro deploy, no terminal do Railway, execute:
```bash
cd backend && npx tsx prisma/seed.ts
```

## Desenvolvimento Local

### Pré-requisitos
- Node.js 20+
- PostgreSQL 15+

### Setup

```bash
# Clone
git clone https://github.com/joseedson18jc/ai-agent12.git
cd ai-agent12
git checkout claude/optical-shop-crm-XLbEP

# Frontend
npm install

# Backend
cd backend
npm install
cp .env.example .env  # Edite DATABASE_URL se necessário

# Banco de dados
npx prisma migrate dev
npx tsx prisma/seed.ts

# Rodar
npx tsx src/index.ts &  # Backend na porta 3001
cd .. && npx vite       # Frontend na porta 5173
```

Acesse: http://localhost:5173

## Módulos

- **Dashboard** — KPIs, gráficos, ações rápidas
- **Clientes** — Cadastro com CPF, endereço via CEP, WhatsApp
- **Receitas Ópticas** — OD/OE, validade, upload de foto/PDF
- **Produtos** — Estoque, margem em tempo real, preço mínimo
- **Vendas / OS** — Wizard 4 etapas, multi-pagamento, fiado
- **Financeiro** — Contas a pagar/receber, caixa diário
- **Fornecedores** — CRUD com contato WhatsApp
- **Laboratórios** — Pedidos de lente vinculados à OS
- **Relatórios** — Vendas, financeiro, estoque, clientes
- **Configurações** — Loja, sistema, usuários
