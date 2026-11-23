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

## Notifications and reminders
- **Staff alerts:** every new request is sent to the clinic by **WhatsApp and email** together (channels can be switched off in admin, **Alerts**).
- **Patient messages:** confirming or cancelling a request messages the patient on WhatsApp. Patients who tick "remind me" get a reminder the day before a confirmed visit.
- **Manual tools in admin:** "WhatsApp them" (opens a prefilled chat, no account needed), "Send reminder", "Send test alert" and "Send tomorrow's reminders now".
- **Providers (all optional):** without keys, messages are recorded as "Not sent (demo)" so the flow is visible. Set the keys below on the API host to send for real. Twilio covers WhatsApp; Resend covers email. Never commit these.

| Name | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio login |
| `TWILIO_WHATSAPP_FROM` | e.g. `whatsapp:+14155238886` (Twilio sandbox or approved sender) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email sending |
| `NOTIFY_PHONE`, `NOTIFY_EMAIL` | Fallback staff contacts (admin Alerts page overrides them) |
| `CRON_SECRET` | Lets an outside pinger call `GET /api/v1/cron/reminders` (header `x-cron-key`) when a free host sleeps |

Reminders also run on an in-app timer every 30 minutes between 9 AM and 8 PM IST.

## Security
- **Sessions:** 4-hour tokens (HS256) kept in the browser tab only; a token stops working when the password changes or the account is deleted.
- **Lockout:** 5 wrong passwords lock an account for 15 minutes (the public demo account is exempt). Login and booking are also rate-limited per IP.
- **Booking abuse:** one open request per phone per day, at most 3 open per phone, 30 requests per IP per day. Cancelling a fake request frees its slot.
- **Roles:** `STAFF` can work on appointment requests; `ADMIN` also edits the site, settings and alerts.
- **Demo account:** in production it cannot change alert targets or send messages. Set `DISABLE_DEMO_LOGIN=true` once the site is for a real clinic.
- **API docs:** on in development; in production only when `ENABLE_DOCS=true`.
- **Browser hardening:** `apps/web/vercel.json` sets a strict Content-Security-Policy. If your API is not on `onrender.com`, change `connect-src` there.
- **Retention:** requests and message logs are deleted after 90 days.

Generate a signing secret and create a real admin (nothing is stored in git):
```bash
bash scripts/gen-jwt-secret.sh --write          # new random HS256 secret into apps/api/.env (not printed)
bash scripts/gen-jwt-secret.sh                  # or print one to paste into Render's Environment tab
npm run admin:create -- owner@clinic.com "Dr. Lakshmi"   # prints a random one-time password in your terminal
```
Security tests: `NODE_ENV=test npm test -w apps/api` (see `apps/api/tests/security.test.ts`).

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
Neon (database) + Render (API in Docker) + Vercel (website), all under one owner account, with you as a GitHub collaborator so that `git push` redeploys everything. **Full step-by-step guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).**

Short version: push to the owner's GitHub repo; create a Neon database and run `npm run db:deploy` once with its address; create the Render service from `render.yaml` (set `DATABASE_URL`, `CORS_ORIGIN`); import `apps/web` in Vercel with `VITE_API_URL` set to the Render address; then set Render's `CORS_ORIGIN` to the Vercel address.

### Environment variables
| Where | Name | Purpose |
|---|---|---|
| API | `DATABASE_URL` | Postgres connection string |
| API | `JWT_SECRET` | Signs login tokens, 32+ random characters (Render generates it; or `bash scripts/gen-jwt-secret.sh`) |
| API | `CORS_ORIGIN` | Allowed website address(es), comma separated |
| API | `ENABLE_DOCS` | `true` to serve `/api/docs` in production |
| API | `CRON_SECRET` | Key for the reminder ping URL (Render generates it) |
| API | `DISABLE_DEMO_LOGIN` | `true` once the site is for a real clinic |
| API | `TWILIO_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFY_*` | Optional messaging (see Notifications above) |
| Web | `VITE_API_URL` | API base URL, no trailing slash (empty in local dev, which uses the Vite proxy) |

## Privacy and scope
Appointment requests store only name, mobile number, patient type, age, preferred date and time, and an optional non-medical note, with a consent tick. No medical records.

## Not built yet (see SRS)
Tamil language toggle, AI chat assistant.
