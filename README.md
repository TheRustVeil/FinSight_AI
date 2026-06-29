<div align="center">

# 💰 FinSight AI

### Your AI-Powered Personal Finance Copilot

An end-to-end personal finance platform that automatically tracks, categorizes, and analyzes your money — then tells you exactly what to do next, powered by an LLM financial advisor.

[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=flat&logo=turborepo&logoColor=white)](https://turbo.build/)

</div>

---

## 📖 What is FinSight AI?

FinSight AI is a full-stack personal finance app. You import your bank transactions (CSV), and the app automatically categorizes them, visualizes where your money goes, tracks budgets and savings goals, surfaces insights and forecasts, and lets you **chat with an AI advisor that sees your real financial data** and gives concrete, data-backed advice.

It's built as a **Turborepo monorepo** with a Next.js frontend, an Express + Prisma backend, background workers for heavy jobs, and a shared types package.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Financial Advisor** | Chat in natural language — the model sees your real spending, budgets, and goals and responds with data-backed advice via **streaming SSE** |
| 📊 **Intelligent Dashboard** | Spending trends, category breakdowns, weekly cash flow, calendar heatmap, recurring-subscription detection — all from live data |
| 📥 **Smart Import Pipeline** | Drag-and-drop bank CSV exports → auto column-mapping → background parsing → auto-categorization, with **real-time progress over SSE** |
| 🏷️ **Auto-Categorization** | Rules-engine-first keyword matching with confidence scoring; high-confidence matches auto-apply, others are suggested for review |
| 💸 **Budgets** | Per-category spending limits with live utilization tracking, alert thresholds, and over-budget detection |
| 🎯 **Savings Goals** | Track progress toward financial milestones with contribution history and auto-completion |
| 🔮 **Insights & Forecasting** | Spending-spike detection, month-end projections, savings opportunities, and a **6-month weighted-moving-average forecast** |
| 📈 **Reports & Export** | Financial summary reports with CSV / JSON export |
| 🔔 **Notification Center** | In-app notifications generated from budget alerts and spending anomalies |
| 🔐 **Production-grade Auth** | JWT access tokens (memory-only) + rotating refresh tokens (HttpOnly cookie, SHA-256 hashed), email verification, Google OAuth |

---

## 🏗️ Architecture

A **Turborepo monorepo** with cleanly separated frontend, backend, and shared packages.

```
finsight-ai/
├── apps/
│   ├── web/                      # Next.js 15 (App Router) frontend
│   │   ├── src/
│   │   │   ├── app/              # Routes: (auth), (dashboard), landing
│   │   │   ├── components/       # charts, layout, landing, shared, ui
│   │   │   ├── hooks/            # React Query data hooks (one per domain)
│   │   │   ├── stores/           # Zustand stores (auth, ui)
│   │   │   └── lib/              # API client, formatters, query client
│   │   └── .env.local.example    # Frontend env template
│   │
│   └── api/                      # Express + TypeScript backend
│       ├── src/
│       │   ├── modules/          # Feature modules — service.ts + router.ts each
│       │   │   ├── auth/  accounts/  categories/  transactions/
│       │   │   ├── dashboard/  import/  budgets/  goals/
│       │   │   ├── ai/chat/  insights/  reports/  notifications/  users/
│       │   ├── workers/          # BullMQ background workers (import, insights)
│       │   ├── middleware/       # auth, validation, error handling, logging
│       │   ├── lib/              # JWT, crypto, mailer, pagination, ApiError
│       │   └── config/           # env, database, redis, queue, logger
│       ├── prisma/               # schema.prisma + seed.ts (18 categories)
│       └── .env.example          # Backend env template
│
├── packages/
│   └── shared/                   # Shared TypeScript types + category constants
│
├── docker/                       # docker-compose: Postgres, Redis, MailHog, MinIO
├── turbo.json                    # Turborepo pipeline
└── package.json                  # yarn workspaces root
```

### Design Highlights

- **Modular backend** — every feature is a self-contained `service.ts` (business logic) + `router.ts` (HTTP), keeping concerns isolated and testable.
- **Server state vs. UI state** — React Query owns all server state with smart cache invalidation; Zustand holds only auth + ephemeral UI state.
- **Token security** — the access token lives **only in memory** (never `localStorage`); refresh tokens are HttpOnly, SHA-256 hashed in the DB, and **rotated on every use**.
- **Background processing** — CSV imports and daily insight generation run on **BullMQ + Redis** workers, decoupled from the request lifecycle.
- **Streaming** — both the AI chat and import-progress endpoints stream over **Server-Sent Events** for real-time UX.

---

## 🔄 Request Lifecycle (backend)

Every API request flows through a consistent middleware pipeline before it reaches business logic:

```
Request
  │
  ├─ helmet()                 # security headers
  ├─ cors()                   # allowlisted origin + credentials
  ├─ express.json()           # body parsing (10mb limit)
  ├─ cookieParser()           # reads the HttpOnly refresh cookie
  ├─ requestLogger            # Pino structured logging
  ├─ rateLimit (/api)         # global throttle
  ├─ rateLimit (/api/v1/auth) # stricter throttle on auth
  │
  ├─ Router (/api/v1/<module>)
  │     ├─ auth.middleware    # verifies Bearer access token → req.user
  │     ├─ validate.middleware# Zod-validates body/query/params
  │     └─ controller/router  # thin HTTP layer
  │           └─ service.ts   # business logic + Prisma queries
  │
  ├─ 404 handler
  └─ errorHandler             # ApiError → { error: { code, message } }
```

Business logic throws a typed **`ApiError`**; the central error handler turns it into a consistent JSON envelope. Controllers stay thin — all real work lives in `service.ts` files, which makes them easy to unit-test.

---

## 🗄️ Data Model

PostgreSQL via Prisma, organized into five concern groups (see [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma)):

| Group | Models |
|-------|--------|
| **Identity & Auth** | `User`, `OAuthAccount`, `RefreshToken`, `EmailVerification`, `PasswordReset`, `UserPreference` |
| **Money Core** | `Account`, `Category`, `Transaction`, `TransactionTag`, `Attachment` |
| **Planning** | `Budget`, `BudgetCategory`, `BudgetAlert`, `Goal`, `GoalContribution` |
| **Pipeline & AI** | `ImportBatch`, `AIConversation`, `AIMessage`, `Insight`, `Notification` |
| **Ops** | `AuditLog` |

Key enums encode domain states: `TransactionType` (income/expense/transfer), `TransactionSource` (manual/csv/…), `ImportStatus`, `InsightType`/`InsightSeverity`, `BudgetPeriod`, `AIMessageRole`. The `Transaction` table is the hub — almost every feature (dashboard stats, budgets, insights, AI context) aggregates over it.

---

## 🔑 Key Flows Explained

These are the flows worth being able to whiteboard.

### 1. Authentication & token security
- **Register** → password hashed (bcrypt), `EmailVerification` token issued, verification email sent (MailHog in dev; dev auto-verifies).
- **Login** → on success the server issues **two** tokens:
  - a short-lived **access JWT** returned in the response body → stored **in memory** (Zustand), never `localStorage` → not readable by XSS.
  - a **refresh token**: a random secret, **SHA-256 hashed** before storage in `RefreshToken`, sent to the browser as an **HttpOnly, Secure cookie**.
- **Refresh** → browser sends the cookie; server hashes + looks it up, **rotates** it (old one revoked, new one issued), and returns a fresh access token. Rotation means a stolen refresh token is single-use.
- **Logout** → refresh token revoked + cookie cleared. **Google OAuth** is modeled via `OAuthAccount`.

> The split (memory access token + HttpOnly rotating refresh token) is a deliberate trade-off: it neutralizes the common XSS-reads-localStorage attack while keeping CSRF surface small.

### 2. CSV import pipeline (async + streaming)
1. **Preview** — user uploads a bank CSV; the API parses headers and **suggests a column mapping**.
2. **Enqueue** — on confirm, an `ImportBatch` row is created (`PENDING`) and a job is pushed onto a **BullMQ queue** (Redis-backed). The HTTP request returns immediately.
3. **Worker** — a background worker parses rows, creates `Transaction`s, runs **auto-categorization**, and updates the batch's progress/counters.
4. **Live progress** — the client subscribes to an **SSE** endpoint and renders a real-time progress bar until the batch completes.

### 3. AI financial advisor (context + streaming)
1. A **context-builder** assembles a compact financial snapshot for the user (spending by category, budget utilization, goals, recent transactions).
2. That snapshot is injected into the **system prompt** so the model answers grounded in real data.
3. The reply is **streamed token-by-token over SSE** (Gemini via the OpenAI-compatible SDK) for a chat-like feel.
4. The conversation and messages persist (`AIConversation` / `AIMessage`) so history survives reloads.

### 4. Auto-categorization
A **rules engine** (keyword/merchant matching with a confidence score) runs first: high-confidence hits auto-apply, lower-confidence ones are surfaced as suggestions. The LLM is only a fallback — this keeps categorization **fast and cheap** for the common case.

### 5. Insights & forecasting
A scheduled worker analyzes transaction history to detect **spending spikes**, project **month-end totals**, and compute a **6-month weighted-moving-average forecast**, persisting results as `Insight`s and raising `Notification`s. Scheduling is **idempotent** (repeatable jobs are cleared before re-adding) so restarts don't create duplicates.

---

## 🧩 Design Decisions & Trade-offs (interview talking points)

| Decision | Why | Trade-off |
|----------|-----|-----------|
| **Turborepo monorepo + shared package** | One source of truth for types across front/back; atomic cross-cutting changes | More build orchestration up front |
| **Service / Router split per module** | Isolates business logic from HTTP; testable units | Slightly more boilerplate |
| **React Query for server state, Zustand for UI/auth** | Caching, invalidation, and refetching handled for free; UI state stays tiny | Two state tools to learn |
| **Memory access token + rotating HttpOnly refresh** | Mitigates XSS token theft; rotation limits replay | Token lost on hard refresh → silent re-auth via refresh cookie |
| **BullMQ workers for import/insights** | Heavy work off the request path; retries + resilience | Requires Redis + a persistent process (not serverless) |
| **SSE for streaming** | Simple one-way server→client streaming; works over plain HTTP | Not bidirectional (would need WebSockets) |
| **Rules-engine-first categorization** | Low latency/cost; deterministic | Needs maintained keyword rules |
| **Prisma ORM** | Type-safe queries, migrations, great DX | Abstraction over raw SQL for complex aggregations |
| **OpenAI-compatible AI client** | Provider-swappable; switched Claude → Gemini for free-tier without rewrites | Lowest-common-denominator API surface |

---

## 🛠️ Tech Stack

**Frontend** — Next.js 15 (App Router), TypeScript, Tailwind CSS, React Query v5, Zustand, React Hook Form + Zod, Recharts, Lucide

**Backend** — Node.js 20+, Express, TypeScript, Prisma ORM, Zod validation, Pino logging, Helmet, rate limiting

**Data & Infra** — PostgreSQL, Redis, BullMQ; Docker Compose for local infra (Postgres / Redis / MailHog / MinIO)

**AI** — Google Gemini (`gemini-2.5-flash`) via the OpenAI-compatible SDK, with streaming + a financial-context builder. The provider is swappable (any OpenAI-compatible endpoint) by editing `apps/api/src/modules/ai/chat/ai-chat.service.ts`.

**Tooling** — Turborepo, Yarn workspaces (Yarn 1.22 via Corepack)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 20 LTS+**
- **Yarn** via Corepack (`corepack enable`) — this repo pins `yarn@1.22.22`
- Either **Docker Desktop** (local Postgres/Redis) _or_ cloud Postgres + Redis (e.g. [Neon](https://neon.tech) + [Upstash](https://upstash.com))

### 1. Install dependencies
```bash
corepack enable
yarn install
```

### 2. Provision a database & Redis

**Option A — Local (Docker):**
```bash
docker compose -f docker/docker-compose.yml up -d
```
Brings up Postgres (`5432`), Redis (`6379`), MailHog (`8025`), MinIO (`9001`).

**Option B — Cloud:** create a Neon Postgres database and an Upstash Redis instance and use their connection strings below.

### 3. Configure environment

```bash
cp apps/api/.env.example       apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Fill in `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finsight"
REDIS_URL="redis://localhost:6379"            # Upstash uses rediss:// (TLS)
JWT_ACCESS_SECRET="<32+ char secret>"
JWT_REFRESH_SECRET="<32+ char secret>"
GEMINI_API_KEY="<google-ai-studio-key>"       # enables the AI advisor
# GEMINI_MODEL="gemini-2.5-flash"             # optional override
# GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET     # optional — Google OAuth
```

`apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 4. Set up the database
```bash
yarn db:push     # apply the Prisma schema
yarn db:seed     # seed 18 system spending categories
```

### 5. Run the app
```bash
yarn dev         # turbo runs api + web together
```
- Web → http://localhost:3000
- API → http://localhost:3001

---

## 📜 Scripts (root)

| Script | What it does |
|--------|--------------|
| `yarn dev` | Run API + web in parallel (Turborepo) |
| `yarn build` | Build all workspaces |
| `yarn lint` | Lint all workspaces |
| `yarn typecheck` | `tsc --noEmit` across workspaces |
| `yarn db:push` | Push Prisma schema to the database |
| `yarn db:migrate` | Run Prisma migrations |
| `yarn db:seed` | Seed default categories |
| `yarn db:studio` | Open Prisma Studio |

---

## 📡 API Overview

All routes are under `/api/v1`. Protected routes require a `Bearer` access token.

| Module | Endpoints |
|--------|-----------|
| **Auth** | `register`, `login`, `logout`, `refresh`, `verify-email`, `forgot/reset-password`, Google OAuth |
| **Transactions** | Full CRUD + filtered pagination + stats (summary, by-category, by-merchant, heatmap, trend) |
| **Dashboard** | `summary`, `spending-trend`, `category-breakdown`, `top-merchants`, `recurring-subscriptions`, `cash-flow`, `heatmap` |
| **Import** | `preview`, upload+enqueue, batch status, **SSE progress stream** |
| **Budgets / Goals** | Full CRUD + live utilization + goal contributions |
| **AI** | Conversations CRUD + **streaming chat** |
| **Insights** | List, generate, forecast, mark-read, dismiss |
| **Reports** | Summary + CSV/JSON export |
| **Notifications** | List, unread count, mark-read, clear |

---

## ☁️ Deployment

This is a **two-service app** — see **[DEPLOYMENT.md](DEPLOYMENT.md)** for full step-by-step instructions.

- **Frontend (`apps/web`) → Vercel** — set Root Directory to `apps/web` and `NEXT_PUBLIC_API_URL` to the API URL. The Next.js `rewrite` proxies `/api/v1/*` to the backend (same-origin to the browser → no CORS headaches).
- **Backend (`apps/api`) → Render** — provisioned from the committed [`render.yaml`](render.yaml) blueprint. It's a persistent Express server with **in-process BullMQ workers**, so it doesn't fit Vercel's serverless model. Starts via `tsx` (the `shared` workspace package is consumed as TypeScript). Uses managed **Neon** (Postgres) + **Upstash** (Redis).

> ⚠️ **Never commit secrets.** Only `.env.example` / `.env.local.example` are tracked; real `.env` files are gitignored. Set production secrets in each platform's dashboard.

---

## 🧠 Engineering Notes

- **Rules-engine-first categorization** keeps costs and latency low — the LLM is a fallback, not the default path.
- **Route ordering matters** — static stat/utility routes are registered before `/:id` params to avoid UUID-parse clashes.
- **Optimistic UI** — dismissing insights and managing notifications updates the cache instantly with rollback on error.
- **Idempotent cron scheduling** — the insights worker clears existing repeatable jobs before re-adding, preventing duplicates across restarts.
- **Extension-proof DOM** — a small client guard patches `Node.insertBefore`/`removeChild` so translation/grammar browser extensions can't crash React's reconciler.

---

<div align="center">

Built with Next.js, TypeScript, Prisma & an LLM advisor

</div>
