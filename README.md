# Nitro Hub Editor

Setup inicial para o time de edicao com:

- Frontend em React + Vite + TypeScript
- Backend em Node.js + Express + TypeScript
- Conexao com PostgreSQL via Prisma

## Estrutura

```text
.
|- frontend
|- backend
|- .gitignore
|- README.md
```

## Configuracao de ambiente

1. Backend:
   - Copie `backend/.env.example` para `backend/.env`
   - Ajuste `DATABASE_URL`
   - Defina `JWT_SECRET`

2. Frontend:
   - Copie `frontend/.env.example` para `frontend/.env`
   - Ajuste `VITE_API_URL` (normalmente `http://localhost:3001`)

## Comandos

### Backend

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Servidor em `http://localhost:3001`:

- `GET /health`
- `GET /db-check`
- `POST /auth/login`
- `GET /auth/me`
- `GET /editors`
- `GET /rates`
- `GET /deliveries`
- `POST /deliveries`
- `PATCH /deliveries/:id`
- `DELETE /deliveries/:id`
- `GET /deliveries/summary`

### Frontend

```bash
cd frontend
npm run dev
```

Aplicacao em `http://localhost:5173`

## Login inicial

- Email: `admin@nitrohub.local`
- Senha: `admin123`

Documentação funcional: [docs/NITRO_HUB_EDITOR.md](docs/NITRO_HUB_EDITOR.md).
