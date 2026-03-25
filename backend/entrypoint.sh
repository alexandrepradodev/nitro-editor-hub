#!/usr/bin/env sh
set -eu

# Garante que o esquema do Prisma esteja aplicado antes de iniciar a API.
# Railway injeta `DATABASE_URL` via Environment Variables.
npx prisma migrate deploy

exec node dist/server.js

