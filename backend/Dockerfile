# Debian slim evita problemas frequentes de Prisma/OpenSSL com Alpine (musl).
#
# O contexto da build precisa ser ESTA pasta (backend), ex.:
#   cd backend && docker build .
# Se o deploy clona a raiz do monorepo sem "Root Directory" = backend, use o
# Dockerfile na raiz do repositório (COPY backend/src ...).
#
# Build
FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# Runtime
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY --from=builder /app/dist ./dist

RUN npx prisma generate

EXPOSE 3001

# Executa migrations automaticamente antes de subir a API.
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
