#!/bin/bash
# ============================================================
# ÓticaGestão — Build de Produção
# Compila frontend + backend em um único pacote
# ============================================================

set -e

echo "=========================================="
echo "  ÓticaGestão — Build de Produção"
echo "=========================================="

# 1. Build Frontend
echo ""
echo "[1/4] Instalando dependências do frontend..."
npm ci

echo "[2/4] Compilando frontend (Vite)..."
npm run build

# 2. Build Backend
echo "[3/4] Instalando dependências do backend..."
cd backend
npm ci

echo "[4/4] Gerando Prisma Client e compilando backend..."
npx prisma generate
npm run build

# 3. Copy frontend build to backend public/
echo ""
echo "Copiando frontend para backend/public..."
rm -rf public
mkdir -p public
cp -r ../dist/* public/

echo ""
echo "=========================================="
echo "  Build concluído com sucesso!"
echo "=========================================="
echo ""
echo "Para iniciar:"
echo "  npx prisma migrate deploy"
echo "  NODE_ENV=production node dist/index.js"
echo ""
