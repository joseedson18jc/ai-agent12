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
  echo "WARNING: Full seed failed. Ensuring admin user exists..."
  npx tsx -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    (async () => {
      const pw = await bcrypt.hash('admin123', 12);
      await prisma.user.upsert({
        where: { email: 'priscila@oticaimperio.com.br' },
        update: { password: pw, role: 'ADMIN', isActive: true },
        create: { name: 'Priscila', email: 'priscila@oticaimperio.com.br', password: pw, role: 'ADMIN', isActive: true },
      });
      console.log('Admin user ensured: priscila@oticaimperio.com.br');
      await prisma.\$disconnect();
    })();
  " 2>&1 || echo "WARNING: Admin user fallback also failed"
}

echo "=== Starting Server ==="
exec node dist/index.js
