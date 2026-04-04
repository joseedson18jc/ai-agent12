#!/bin/sh
set -e

echo "=== Ótica Império Start ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "Working directory: $(pwd)"
echo "DATABASE_URL set: $(if [ -n "$DATABASE_URL" ]; then echo YES; else echo NO; fi)"

# Check if dist/index.js exists
if [ ! -f "dist/index.js" ]; then
  echo "ERROR: dist/index.js not found!"
  ls -la dist/ 2>/dev/null || echo "dist/ directory does not exist"
  exit 1
fi

# Check if prisma directory exists
if [ ! -d "prisma" ]; then
  echo "ERROR: prisma/ directory not found!"
  ls -la
  exit 1
fi

echo "=== Running Prisma Migrate ==="
npx prisma migrate deploy 2>&1 || {
  echo "WARNING: prisma migrate deploy failed, but continuing..."
}

echo "=== Running Seed ==="
npx tsx prisma/seed.ts 2>&1 || {
  echo "WARNING: seed failed, but continuing..."
}

echo "=== Starting Server ==="
exec node dist/index.js
