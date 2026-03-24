# Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY --from=builder /app/dist ./dist

RUN npx prisma generate

EXPOSE 3001

# Rode migrations antes ou no deploy: npx prisma migrate deploy
CMD ["node", "dist/server.js"]
