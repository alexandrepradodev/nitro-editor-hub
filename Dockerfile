# Backend — contexto de build = raiz do repositório (Git / Railway / etc.).
# Se a plataforma já usar "Root Directory" = backend, use backend/Dockerfile em vez deste.
# Debian slim: Prisma + OpenSSL
FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/prisma ./prisma
COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/prisma ./prisma
COPY --from=builder /app/dist ./dist

RUN npx prisma generate

EXPOSE 3001

CMD ["node", "dist/server.js"]
