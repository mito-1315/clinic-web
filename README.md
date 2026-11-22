# Lakshmi Child Care Center: demo clinic website, admin dashboard and REST API

A full-stack demo for a neighbourhood clinic in Kundrathur, Chennai (children and adults). **All content is fictional sample data.**

- **Public website** (mobile-first React): home, about, doctors, services, visit & contact, appointment request form, privacy.
- **Admin dashboard** (`/admin`): manage appointment requests, services, doctors, notices, timings, holiday closures and clinic settings.
- **REST API**: Node.js, Express 5, TypeScript, PostgreSQL, Prisma, JWT auth, Zod validation, rate limiting, Swagger docs.

Full requirements: [docs/SRS.md](docs/SRS.md).

## Live features (API-driven)
- **Live availability:** `GET /api/v1/availability` feeds the home page "Pick a time" strip and the booking form's Morning/Evening chips (open hours, holidays, per-slot capacity; the API rejects full or closed slots with 409).
- **Request tracking:** `POST /api/v1/appointments/lookup` powers `/track`, which refreshes itself every few seconds, so a status change made in the admin shows up without reloading.
- **Admin overview:** auto-refreshing counts, a 7-day chart and a "new request just arrived" alert.
- **API status chip** in the site footer calls `GET /api/v1/health`.

## Demo login (fake data only)
`admin@demo.clinic` / `Demo@12345`

## Run locally
Needs Node 22+ and Docker.

```bash
npm install
cp apps/api/.env.example apps/api/.env      # Windows: copy apps\api\.env.example apps\api\.env
npm run db:up                                # Postgres 16 in Docker on port 5433
npm run db:migrate                           # create tables
npm run db:seed                              # demo data (re-run any time to reset it)
npm run dev:api                              # http://localhost:4000  (Swagger: /api/docs)
npm run dev:web                              # http://localhost:5173  (admin: /admin)
```

Tests (API, uses the local database): `NODE_ENV=test npm test -w apps/api`

## Structure
```
apps/api   Express + Prisma API, Swagger spec in src/openapi.ts
apps/web   React + Vite + Tailwind (public site and /admin)
docs/      SRS
Dockerfile API image (build from repo root)
```

## Deploy (free tiers)
Create the accounts under a separate demo "owner" login, then invite yourself as collaborator.

1. **Database: Neon.** Create a project, copy the connection string.
2. **Seed it once from your machine** (set `DATABASE_URL` to the Neon string for this command only, never commit it):
   `DATABASE_URL="<neon url>" npx prisma migrate deploy --schema apps/api/prisma/schema.prisma` then `DATABASE_URL="<neon url>" npm run db:seed`
3. **API: Render.** New Blueprint from this repo (uses `render.yaml`), or a Docker web service. Set `DATABASE_URL` (Neon) and `CORS_ORIGIN` (your Vercel URL). `JWT_SECRET` is generated for you. The free plan sleeps when idle, so the first request can take about 30 seconds.
4. **Web: Vercel.** Import the repo, set root directory `apps/web`, and add env var `VITE_API_URL` = your Render URL (no trailing slash). SPA routing is handled by `apps/web/vercel.json`.
5. Check `<render-url>/api/v1/health`, then open the Vercel URL and log in to `/admin`.

### Environment variables
| Where | Name | Purpose |
|---|---|---|
| API | `DATABASE_URL` | Postgres connection string |
| API | `JWT_SECRET` | Signs login tokens (required in production) |
| API | `CORS_ORIGIN` | Allowed web origin(s), comma separated |
| Web | `VITE_API_URL` | API base URL (empty in local dev, which uses the Vite proxy) |

## Privacy and scope
Appointment requests store only name, mobile number, patient type, age, preferred date and time, and an optional non-medical note, with a consent tick. No medical records.

## Not built yet (see SRS)
Image upload, two opening sessions per day, Tamil language toggle, AI chat assistant.
