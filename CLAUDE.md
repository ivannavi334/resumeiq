# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ResumeIQ is an AI-powered resume analysis SaaS. Users upload resumes, optionally paste a job description, and receive structured scoring feedback powered by OpenAI GPT-4o-mini. Subscriptions are managed via Stripe with three tiers: Free (3/month), Pro (50/month), Enterprise (unlimited).

## Commands

### Full Stack (recommended)
```bash
docker compose up --build   # Start all services (DB, Redis, backend, frontend)
docker compose down         # Stop all services
```

### Backend
```bash
cd backend
python run.py               # Start uvicorn dev server on :8000 (hot-reload in DEBUG mode)
alembic upgrade head        # Apply pending DB migrations
alembic revision --autogenerate -m "description"  # Generate migration from model changes
```

### Frontend
```bash
cd frontend
npm run dev      # Vite dev server on :5173
npm run build    # tsc + vite build (type-check included)
npm run lint     # ESLint across src/
npm run preview  # Preview production build
```

## Architecture

### Monorepo Structure
- `backend/` — FastAPI Python app
- `frontend/` — React + TypeScript Vite app
- `docker-compose.yml` — orchestrates PostgreSQL 16, Redis 7, backend (:8000), frontend (:5173)

### Backend (`backend/app/`)
Strict layered architecture: **routers → services → models/schemas**

| Layer | Path | Responsibility |
|---|---|---|
| Routers | `routers/` | HTTP routing, request validation, auth dependency injection |
| Services | `services/` | Business logic (auth, resume analysis, quota enforcement) |
| Models | `models/` | SQLAlchemy ORM: User, Resume, ResumeAnalysis, Subscription |
| Schemas | `schemas/` | Pydantic DTOs for request/response |
| Utils | `utils/` | JWT helpers, bcrypt password hashing, Supabase JWKS validation |
| Config | `config.py` | Pydantic Settings loaded from `.env` |

- API base: `http://localhost:8000/api/v1`
- Three routers: `/auth`, `/resumes`, `/billing`
- Rate limiting: 60 req/min, 1000 req/hr via slowapi
- Health check: `GET /api/health`
- `DEBUG=true` enables Swagger UI at `/api/docs` and uvicorn hot-reload
- Static file serving: `/uploads` path mounted at startup

### Authentication: Dual JWT System

`routers/deps.py` accepts **two token types** in the same `get_current_user` dependency:

1. **Internal JWT** (HS256) — issued by `/auth/login` and `/auth/register` using `SECRET_KEY`
2. **Supabase JWT** (RS256/ES256) — issued by Supabase Auth frontend; validated against Supabase JWKS with 1-hour in-memory cache

When a Supabase token is validated for the first time, a `User` row is auto-created in the local PostgreSQL DB using the Supabase `sub` claim as the user ID. This means the frontend can use Supabase Auth exclusively without explicit `/auth/register` calls.

`frontend/src/services/api.ts` always sends the Supabase session token; the internal JWT endpoints are effectively unused in production.

### Frontend (`frontend/src/`)

- **Routing:** React Router v7; authenticated routes wrapped in `AppLayout`. Routes: `/` (LandingPage), `/login`, `/register`, `/dashboard`, `/billing`, `/profile`
- **Global state:** Zustand auth store in `store/authStore.ts` — holds Supabase session and user profile
- **Server state:** TanStack React Query (staleTime=30s, retry=1) for all API calls; queries/mutations are inline in components (no custom hooks), invalidated via `queryClient.invalidateQueries()`
- **API client:** axios in `services/api.ts` injects Supabase JWT from `supabase.auth.getSession()`; retries once on 401 after token refresh, then redirects to `/login`. Feature-specific wrappers: `services/resume.ts`, `services/auth.ts`, `services/billing.ts`
- **Forms:** React Hook Form + Zod schema validation
- **Styling:** Tailwind CSS v4; `cn()` (clsx wrapper) for conditional classes; component variants via plain object maps
- **Components:** UI primitives in `components/ui/` (Button, Card, Input, Badge, ScoreRing, Toast); layout in `components/layout/`; feature-specific in `components/resume/`
- **Supabase client:** `lib/supabase.ts` — used only for auth; data lives in PostgreSQL via the backend API
- **Path alias:** `@` maps to `./src` (configured in `vite.config.ts` and `tsconfig.json`)

Vite proxies `/api` → `VITE_API_BASE_URL` (or `localhost:8000`), so the frontend never hard-codes the backend URL in dev.

### Billing Endpoints

| Endpoint | Description |
|---|---|
| `GET /billing/plans` | Returns plan details (features, prices, limits) — no auth required |
| `POST /billing/create-checkout-session?price_id=...` | Creates Stripe checkout session; requires auth |
| `POST /billing/webhook` | Stripe webhook; handles `checkout.session.completed` to upgrade user plan |

Stripe checkout redirects to `FRONTEND_URL/dashboard?upgraded=true` on success and `FRONTEND_URL/billing` on cancel. The webhook maps `STRIPE_PRICE_ID_ENTERPRISE` → Enterprise plan; any other price → Pro.

### Resume Analysis Pipeline
1. Quota checked first (`check_analysis_quota`) — returns 402 if exceeded. Quota resets on a 30-day rolling window from `analyses_reset_at`.
2. File saved to `uploads/{user_id}/{uuid}{ext}`; text extracted via pdfplumber (PDF), python-docx (.docx), or plain read (TXT); `.doc` falls back to plain-text read
3. Resume text truncated to 6000 chars before sending to OpenAI
4. GPT-4o-mini returns structured JSON → parsed into score fields + arrays. Analysis response shape:
   - Scores: `overall_score`, `ats_score`, `skills_match_score`, `experience_score`, `format_score` (all 0–100)
   - Arrays: `strengths`, `weaknesses`, `keywords_found`, `keywords_missing`
   - `suggestions` — list of `{category, suggestion, priority}` objects
   - `ai_summary` — 2–3 sentence string
   - `raw_ai_response` — full JSON blob stored as-is
5. Status transitions: `PENDING → PROCESSING → COMPLETED|FAILED`; `analyses_used_this_month` incremented on success
6. If `OPENAI_API_KEY` is absent, a hardcoded mock analysis is returned silently (not an error)

**Analysis runs synchronously (blocking)**. Celery is in `requirements.txt` but not wired up — there is no background task queue. OpenAI calls typically take 2–10 seconds.

Supported file types: `.pdf`, `.doc`, `.docx`, `.txt`. Max size: 10 MB.

### Backend Conventions

- **Schema naming:** Pydantic DTOs suffixed by purpose — `UserRead`, `ResumeCreate`, `AnalysisRequest`; ORM models use `model_config = ConfigDict(from_attributes=True)`
- **DB models:** UUID primary keys (`postgresql.UUID`), timezone-aware timestamps (`DateTime(timezone=True), server_default=func.now()`), cascade deletes on child relationships
- **Plan limits** defined in `config.py`: `FREE_PLAN_ANALYSES_PER_MONTH=3`, `PRO_PLAN_ANALYSES_PER_MONTH=50`, `ENTERPRISE_PLAN_ANALYSES_PER_MONTH=999999`
- DB connection pool: `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`

### Key External Integrations
- **OpenAI:** `POST /resumes/{id}/analyze` — GPT-4o-mini with mock fallback
- **Stripe:** Webhook at `POST /billing/webhook` handles `checkout.session.completed`; upgrades user plan based on `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_ENTERPRISE` env vars
- **Supabase:** Auth only — JWKS endpoint used by backend to validate RS256 tokens; `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` required in frontend
- **AWS S3:** Credentials in config but unused; files stored in local `uploads/`
- **SMTP / Redis:** Config fields exist but no code uses them

## Known Limitations

- **Synchronous AI analysis** — `POST /resumes/{id}/analyze` blocks for 2–10 s while calling OpenAI. Celery is in `requirements.txt` but not wired up.
- **No resume pagination UI** — `GET /resumes/` supports `?skip=&limit=` (default 20, max 100) but the dashboard always loads the first page.

## Testing

No test files exist yet. When added:

```bash
cd backend
pytest                                   # run all tests
pytest tests/test_file.py::test_function # run single test
pytest -x                                # stop on first failure
```

Frontend test runner is not configured.

## Environment Setup

**Backend** — create `backend/.env`:
```
DATABASE_URL=postgresql://...
SECRET_KEY=<32+ char random string>
SUPABASE_URL=https://<project>.supabase.co    # required for Supabase JWT validation
SUPABASE_JWT_SECRET=<jwt-secret>              # from Supabase project settings
ALLOWED_ORIGINS=http://localhost:5173         # comma-separated CORS origins
FRONTEND_URL=http://localhost:5173            # used for Stripe redirect URLs
OPENAI_API_KEY=sk-...          # optional, enables AI analysis (mock returned if absent)
STRIPE_SECRET_KEY=...          # optional
STRIPE_WEBHOOK_SECRET=...      # optional
STRIPE_PRICE_ID_PRO=price_...  # optional
STRIPE_PRICE_ID_ENTERPRISE=price_...  # optional
DEBUG=true                     # enables hot-reload and Swagger UI
```

**Frontend** — create `frontend/.env`:
```
VITE_SUPABASE_URL=https://<project>.supabase.co   # required
VITE_SUPABASE_ANON_KEY=eyJ...                     # required
VITE_API_BASE_URL=http://localhost:8000
VITE_API_PREFIX=/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_ENABLE_BILLING=true       # show/hide billing UI
```
