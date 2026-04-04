# ============================================================
# Ótica Império — Dockerfile de Produção (Monolito)
# Frontend (Vite build) + Backend (Express) em uma única imagem
# ============================================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Install Backend Dependencies
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# Stage 3: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate
RUN npm run build

# Stage 4: Production Image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy backend compiled code
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package.json ./package.json
COPY --from=backend-builder /app/backend/prisma ./prisma

# Copy frontend built files into public/ (served by Express)
COPY --from=frontend-builder /app/frontend/dist ./public

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3001

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
