# ResumeIQ

AI-powered resume analysis SaaS. Users upload resumes, optionally paste a job description, and receive structured ATS scoring and improvement feedback powered by OpenAI GPT-4o-mini.

## Architecture

```
┌─────────────────────┐     HTTPS      ┌──────────────────────┐
│  Vercel (Frontend)  │ ─────────────► │  Railway (Backend)   │
│  React + Vite       │                │  FastAPI + Python    │
└─────────────────────┘                └──────────┬───────────┘
                                                  │
                              ┌───────────────────┼────────────────┐
                              │                   │                │
                    ┌─────────▼──────┐  ┌─────────▼──────┐  ┌────▼────────┐
                    │  PostgreSQL    │  │  Supabase Auth  │  │   OpenAI    │
                    │  (Railway)     │  │  (JWT tokens)   │  │  GPT-4o-mini│
                    └────────────────┘  └────────────────┘  └─────────────┘
```

- **Auth:** Supabase handles registration/login; backend validates JWTs via JWKS endpoint
- **Storage:** Resume files saved to `uploads/` on Railway persistent volume
- **Billing:** Stripe Checkout + webhooks to upgrade user plan in DB

## Local Development

```bash
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger UI: http://localhost:8000/api/docs (only when `DEBUG=true`)

## Deployment

### Backend → Railway

1. Create a new Railway project, add a **PostgreSQL** service
2. Connect this repo and set **Root Directory** to `backend/`
3. Railway detects the Dockerfile automatically; `railway.json` sets the start command
4. Migrations run automatically on every deploy (`alembic upgrade head`)
5. Copy the Railway public domain (e.g. `https://resumeiq-backend.up.railway.app`)

### Frontend → Vercel

1. Import this repo in Vercel, set **Root Directory** to `frontend`
2. Framework preset: **Vite**
3. Set environment variables — especially `VITE_API_BASE_URL` pointing to your Railway URL
4. `vercel.json` handles SPA routing (all paths → `index.html`)

### Post-deploy CORS

Add your Vercel domain to `ALLOWED_ORIGINS` in Railway environment variables:

```
ALLOWED_ORIGINS=https://your-app.vercel.app,https://yourdomain.com
```

---

## Environment Variables

### Backend (Railway)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (auto-set by Railway PostgreSQL service) |
| `SECRET_KEY` | ✅ | Random 32+ char string for internal JWT signing |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_JWT_SECRET` | ✅ | Supabase JWT secret (Settings → API → JWT Secret) |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated allowed CORS origins (include your Vercel domain) |
| `OPENAI_API_KEY` | ✅ | OpenAI API key — without it, mock analysis data is returned |
| `STRIPE_SECRET_KEY` | ⚡ | Stripe secret key (needed for billing) |
| `STRIPE_WEBHOOK_SECRET` | ⚡ | Stripe webhook signing secret |
| `STRIPE_PRICE_ID_PRO` | ⚡ | Stripe Price ID for Pro plan |
| `STRIPE_PRICE_ID_ENTERPRISE` | ⚡ | Stripe Price ID for Enterprise plan |
| `DEBUG` | ➖ | Set `false` in production (disables Swagger UI) |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `VITE_API_BASE_URL` | ✅ | Railway backend URL (e.g. `https://resumeiq-backend.up.railway.app`) |
| `VITE_API_PREFIX` | ➖ | API prefix, default `/api/v1` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ⚡ | Stripe publishable key |
| `VITE_ENABLE_BILLING` | ➖ | Show/hide billing UI, default `true` |

---

## Plan Limits

| Plan | Analyses / month |
|---|---|
| Free | 3 |
| Pro | 50 |
| Enterprise | Unlimited |

Quota enforced in `backend/app/services/resume_service.py` → `check_analysis_quota()`.

## Database Migrations

```bash
cd backend

# Apply pending migrations
alembic upgrade head

# Generate migration after model changes
alembic revision --autogenerate -m "description"

# Run a single test
pytest tests/test_file.py::test_function
```
