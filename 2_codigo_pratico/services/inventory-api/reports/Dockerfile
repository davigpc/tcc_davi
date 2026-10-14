# Dockerfile — serviço de Relatórios (extraído do inventory-api)

# ─── Base ───────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ─── Dependencias ───────────────────────────────────────────────
FROM base AS deps
COPY package.json ./
RUN npm install

# ─── Build ──────────────────────────────────────────────────────
FROM deps AS builder
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ─── Producao ───────────────────────────────────────────────────
FROM base AS production
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
