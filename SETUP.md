# FinSight AI — Setup Guide

## Prerequisites

- Node.js >= 20
- Docker Desktop
- Git

## 1. Fix npm (if broken)

If `npm` throws MODULE_NOT_FOUND, reinstall Node from https://nodejs.org/en/download
Choose LTS version. This will restore npm automatically.

## 2. Clone and install

```bash
git clone <repo-url>
cd finsight-ai

# Install all workspace dependencies
npm install
```

## 3. Start infrastructure

```bash
# Start PostgreSQL, Redis, MailHog, MinIO
docker compose -f docker/docker-compose.yml up -d

# Verify all running
docker compose -f docker/docker-compose.yml ps
```

## 4. Configure environment

```bash
# API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — fill in JWT secrets (at minimum)

# Web
cp apps/web/.env.local.example apps/web/.env.local
```

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```
Run that twice — once for JWT_ACCESS_SECRET, once for JWT_REFRESH_SECRET.

## 5. Set up database

```bash
# Push schema to DB
npm run db:push

# Seed system categories
npm run db:seed
```

## 6. Run development servers

```bash
# Start both API (port 3001) and Web (port 3000)
npm run dev
```

## Service URLs

| Service | URL |
|---|---|
| Web App | http://localhost:3000 |
| API | http://localhost:3001 |
| API Health | http://localhost:3001/health |
| MailHog (email dev) | http://localhost:8025 |
| MinIO Console (file storage) | http://localhost:9001 |
| Prisma Studio | `npm run db:studio` |

## MinIO setup (first time only)

1. Open http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. Create bucket: `finsight-uploads`
4. Set bucket access policy to Private

## Environment Variables Reference

See `apps/api/.env.example` for all required variables.

Minimum required to run:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET` (32+ chars)
- `JWT_REFRESH_SECRET` (32+ chars)

## Build phases

The project is built in 9 phases. Current status: **Phase 1 complete**.
See memory files or ask Claude Code for current phase status.
