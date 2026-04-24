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
| Utils | `utils/` | JWT helpers, bcrypt password hashing |
| Config | `config.py` | Pydantic Settings loaded from `.env` |

- API base: `http://localhost:8000/api/v1`
- Three routers: `/auth`, `/resumes`, `/billing`
- Auth via JWT: access token (30 min) + refresh token (7 days); `get_current_user` dependency in `routers/deps.py`
- Rate limiting: 60 req/min, 1000 req/hr via slowapi

### Frontend (`frontend/src/`)

- **Routing:** React Router v7; authenticated routes wrapped in `AppLayout`
- **Global state:** Zustand auth store with localStorage persistence (`store/`)
- **Server state:** TanStack React Query for all API calls with auto-retry
- **API client:** axios in `services/api.ts` with interceptors for JWT injection and auto-refresh on 401
- **Forms:** React Hook Form + Zod schema validation
- **Styling:** Tailwind CSS v4

Vite proxies `/api` → `localhost:8000`, so the frontend never hard-codes the backend URL in dev.

### Resume Analysis Pipeline
1. Quota checked first (`check_analysis_quota` in `services/resume_service.py`) — returns 402 if exceeded
2. File saved to `uploads/{user_id}/{uuid}{ext}`; text extracted via pdfplumber (PDF) or plain read (TXT)
3. Resume text truncated to 6000 chars before sending to OpenAI
4. GPT-4o-mini returns structured JSON → parsed into 8 score columns + strengths/weaknesses/keywords arrays
5. Status transitions: `PENDING → PROCESSING → COMPLETED|FAILED`; `analyses_used_this_month` incremented on success
6. If `OPENAI_API_KEY` is absent, mock analysis returned (not an error)

Supported file types: `.pdf`, `.doc`, `.docx`, `.txt`. Max size: 10 MB.

**Note:** Analysis runs synchronously (blocking). Celery is in `requirements.txt` but is not wired up — there is no background task queue.

### Key External Integrations
- **OpenAI:** `POST /resumes/{id}/analyze` — GPT-4o-mini with mock fallback
- **Stripe:** Webhook at `POST /billing/webhook` handles `checkout.session.completed` to upgrade plan; no server-side price/product creation logic
- **AWS S3:** Credentials in config but unused; resumes stored in local `uploads/` directory
- **SMTP:** Config fields exist in `config.py` but no email-sending code is implemented

### Other Backend Notes
- Health check: `GET /api/health`
- DB connection pool: `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True` (`app/database.py`)
- `DEBUG=true` enables Swagger UI at `/docs`; disabled in production
- Static file serving: `/uploads` path mounted at startup

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
OPENAI_API_KEY=sk-...          # optional, enables AI analysis
STRIPE_SECRET_KEY=...          # optional
STRIPE_WEBHOOK_SECRET=...      # optional
DEBUG=true                     # enables hot-reload and Swagger UI
```

**Frontend** — create `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_PREFIX=/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_ENABLE_BILLING=true       # show/hide billing UI
VITE_ENABLE_ANALYTICS=false    # PostHog integration (optional)
```
