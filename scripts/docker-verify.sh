#!/usr/bin/env bash
# Verifica builds Docker (backend com dois contextos + frontend) e smoke tests.
# Raiz do repo: bash scripts/docker-verify.sh
# Sem permissão no socket: sudo usermod -aG docker "$USER" (novo login) ou: sg docker -c 'bash scripts/docker-verify.sh'

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if docker info >/dev/null 2>&1; then
  dk() { docker "$@"; }
elif sg docker -c "docker info" >/dev/null 2>&1; then
  dk() { sg docker -c "docker $(printf '%q ' "$@")"; }
  echo "Aviso: usando 'sg docker' — adicione seu usuário ao grupo 'docker' para usar só 'docker'."
else
  echo "Erro: Docker não acessível."
  exit 1
fi

echo "== Backend (contexto: backend/) =="
dk build -t nitro-hub-backend:local-backend -f "$ROOT/backend/Dockerfile" "$ROOT/backend"

echo "== Backend (contexto: raiz do repo) =="
dk build -t nitro-hub-backend:local-root -f "$ROOT/Dockerfile" "$ROOT"

echo "== Frontend (contexto: frontend/) =="
dk build -t nitro-hub-frontend:local \
  --build-arg "VITE_API_URL=${VITE_API_URL:-http://localhost:3001}" \
  -f "$ROOT/frontend/Dockerfile" "$ROOT/frontend"

echo "== Smoke: API /health =="
dk run -d --rm --name nitro-api-smoke -p 3099:3001 \
  -e DATABASE_URL=postgresql://u:p@127.0.0.1:5432/x \
  -e JWT_SECRET=localtest_secret_min8 \
  -e FRONTEND_URL=http://localhost \
  nitro-hub-backend:local-root
sleep 2
curl -sSf "http://127.0.0.1:3099/health" | head -c 200
echo
dk stop nitro-api-smoke || true

echo "== Smoke: Frontend HTML =="
dk run -d --rm --name nitro-fe-smoke -p 3098:80 nitro-hub-frontend:local
sleep 1
curl -sSf "http://127.0.0.1:3098/" | head -c 120
echo
dk stop nitro-fe-smoke || true

echo "OK — builds e smoke tests concluídos."
