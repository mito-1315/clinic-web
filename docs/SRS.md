# Software Requirements Specification (SRS)

**Project:** Lakshmi Child Care Center: demo clinic website, admin dashboard and REST API
**Version:** 0.1 (draft, editable)
**Author:** Mithesh Tharun
**Status:** Demo / portfolio project. All content is fictional placeholder content.

> This is a living document. Edit freely. Items are tagged **[MUST]**, **[SHOULD]**, **[OPTIONAL]** (may or may not be built).

---

## 1. Introduction

### 1.1 Purpose
Define what will be built: a public clinic website, a staff admin dashboard and a REST API. The project doubles as (a) a showcase of a clinic website and (b) a live demo of a Node.js REST API + React admin dashboard for freelance (Fiverr) gigs.

### 1.2 Background
Lakshmi Child Care Center is a clinic in Kundrathur, Chennai. It treats **children and adults** (general medicine such as fever and cough, paediatrics), has founder-doctors, nurses, and a visiting skin specialist on Saturdays. It has no website of its own. This build is a **self-initiated demo**, not a commissioned job.

### 1.3 Scope
In scope: public website, admin dashboard, API, database, deployment, documentation, portfolio assets.
Out of scope: patient medical records, online payments, teleconsultation, billing, prescriptions, pharmacy, insurance.

### 1.4 Content policy
- All doctor names, qualifications, achievements, testimonials and photos are **fictional placeholders** (no real person's credentials are invented).
- A "Demo website" notice appears in the footer and on the admin login page.
- Only licensed or self-made assets (fonts, icons, images). Prefer open-licence fonts (e.g. Google Fonts) and own/stock-licensed or illustrated imagery.
- Demo admin account uses fake data only.

### 1.5 Definitions
| Term | Meaning |
|---|---|
| Visitor | Patient/parent using the public site |
| Staff/Admin | Clinic employee using the dashboard |
| Appointment request | A request (not a confirmed booking) submitted via the form |
| SRS | This document |

---

## 2. Overall Description

### 2.1 Users
| Role | Description | Device |
|---|---|---|
| Visitor | Parents and adults looking for info, timings, location, booking | Mostly mobile |
| Admin | Receptionist/doctor managing requests and content | Mobile and desktop |
| Developer/Evaluator | Fiverr prospect exploring the API and dashboard | Desktop |

### 2.2 Product perspective
Three parts: **Web app** (React: public site + `/admin`), **API** (Node/Express), **PostgreSQL**. The web app consumes the API.

### 2.3 Assumptions and constraints
- Free-tier hosting; no custom domain (free subdomains).
- Hosted from a separate demo "owner" account, with the developer invited as collaborator.
- Mobile-first; desktop must also be fully responsive.
- Minimal dependencies; small, verified, incremental commits.
- No secrets in the repo; `.env.example` only.

---

## 3. Functional Requirements

### 3.1 Public website
| ID | Requirement | Priority |
|---|---|---|
| PUB-1 | **Home:** hero with clinic name, tagline, "Request appointment", "Call", "WhatsApp" buttons; highlights; today's open/closed status; announcement banner | MUST |
| PUB-2 | **About:** clinic story, values, achievements/recognition (placeholder), facilities | MUST |
| PUB-3 | **Doctors & team:** founder doctors, visiting skin specialist (Saturdays), nursing staff; qualification, experience, specialty, photo/illustration | MUST |
| PUB-4 | **Services:** list from API, grouped (Paediatrics, General medicine for adults, Skin care (Saturdays), Vaccination, Health check-ups, Minor procedures); detail text; no prices required | MUST |
| PUB-5 | **Timings & location:** weekly timetable from API, Saturday skin clinic note, address, embedded map (OpenStreetMap or Google Maps link), directions link | MUST |
| PUB-6 | **Contact:** phone (tap to call), WhatsApp click-to-chat, email, address | MUST |
| PUB-7 | **Appointment request form:** name, phone, patient type (child/adult), age, preferred date and time slot, service (optional), short note (non-medical, length-limited); consent checkbox | MUST |
| PUB-8 | Form confirmation screen with reference number; clear message that this is a *request*, and staff will call to confirm | MUST |
| PUB-9 | **Privacy notice:** what is collected, why, retention, who sees it, how to request deletion | MUST |
| PUB-10 | **FAQ** (visiting hours, what to bring, vaccinations, emergency guidance) | SHOULD |
| PUB-11 | **Health tips / news** (admin-managed posts) | OPTIONAL |
| PUB-12 | Testimonials (fictional, clearly marked as sample) | SHOULD |
| PUB-13 | Floating call/WhatsApp action button on mobile | SHOULD |
| PUB-14 | Emergency note: "In an emergency call your nearest hospital / 108" | MUST |
| PUB-15 | 404 page, offline-friendly basics | SHOULD |

### 3.2 Admin dashboard (`/admin`)
| ID | Requirement | Priority |
|---|---|---|
| ADM-1 | Login with email and password; logout; session expiry | MUST |
| ADM-2 | Overview: counts of new / confirmed / cancelled requests, today's requests | MUST |
| ADM-3 | Appointment list: search by name/phone, filter by status/date/patient type, sort, pagination | MUST |
| ADM-4 | Appointment detail: change status (new, confirmed, cancelled, completed/no-show optional), internal staff note, timestamps | MUST |
| ADM-5 | Services CRUD (title, description, category, order, active flag) | MUST |
| ADM-6 | Doctors/staff CRUD (name, role, qualification, experience, bio, photo, visiting days, order, active) | MUST |
| ADM-7 | Timings editor (per weekday: open/close, closed flag, note) and special-day overrides (holiday) | MUST |
| ADM-8 | Announcements CRUD with start/end dates and active flag | MUST |
| ADM-9 | Clinic settings (name, phone, WhatsApp number, address, map link, email) | SHOULD |
| ADM-10 | Image upload (doctor photos) with size/type limits | SHOULD |
| ADM-11 | Export appointments to CSV | OPTIONAL |
| ADM-12 | Admin user management and roles (admin, receptionist) | OPTIONAL |
| ADM-13 | Change own password | SHOULD |
| ADM-14 | Audit log of status changes | OPTIONAL |
| ADM-15 | Read-only **demo mode** account so evaluators cannot break data; data reset script | SHOULD |
| ADM-16 | Mobile-friendly layout (cards instead of wide tables on small screens) | MUST |

### 3.3 REST API
Base path `/api/v1`. JSON only. Swagger UI at `/api/docs`.

**Public (no auth)**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/services` | Active services |
| GET | `/doctors` | Active doctors/staff |
| GET | `/timings` | Weekly timings and overrides |
| GET | `/announcements/active` | Current announcements |
| GET | `/settings/public` | Clinic contact info |
| POST | `/appointments` | Submit request (rate limited, validated) |
| GET | `/health` | Health check |

**Admin (JWT)**
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Obtain token |
| POST | `/auth/logout` | Invalidate session (if refresh tokens used) |
| GET | `/auth/me` | Current user |
| GET | `/admin/appointments` | List with filters and pagination |
| GET/PATCH | `/admin/appointments/:id` | Detail / update status and note |
| GET | `/admin/stats` | Dashboard counts |
| CRUD | `/admin/services`, `/admin/doctors`, `/admin/announcements` | Content management |
| PUT | `/admin/timings` | Update timings |
| PUT | `/admin/settings` | Update clinic settings |
| POST | `/admin/uploads` | Image upload |

API requirements:
- API-1 Input validation on every endpoint (Zod); consistent error format `{ error: { code, message, details? } }` **[MUST]**
- API-2 JWT auth, bcrypt password hashing, role check middleware **[MUST]**
- API-3 Rate limiting on login and appointment submission; honeypot field against bots **[MUST]**
- API-4 CORS restricted to the web origin; Helmet security headers **[MUST]**
- API-5 Pagination (`page`, `limit`) and filtering on list endpoints **[MUST]**
- API-6 OpenAPI/Swagger docs kept in sync, with a "try it out" flow **[MUST]**
- API-7 Prisma migrations and seed script **[MUST]**
- API-8 Structured request logging, no personal data in logs **[SHOULD]**
- API-9 Automated tests (unit + a few integration tests) **[SHOULD]**
- API-10 Response caching headers for public GET endpoints **[OPTIONAL]**

---

## 4. Data Model (initial, Prisma / PostgreSQL)

| Entity | Fields |
|---|---|
| **AdminUser** | id, email (unique), passwordHash, name, role (ADMIN/STAFF), isDemo, createdAt |
| **Appointment** | id, refCode (unique), patientName, phone, patientType (CHILD/ADULT), age, preferredDate, preferredSlot, serviceId?, note?, status (NEW/CONFIRMED/CANCELLED/COMPLETED), staffNote?, consentAt, createdAt, updatedAt |
| **Service** | id, title, description, category, sortOrder, isActive |
| **Doctor** | id, name, role, qualification, experienceYears, bio, photoUrl?, visitingDays?, sortOrder, isActive |
| **Timing** | id, weekday (0-6), openTime, closeTime, isClosed, note |
| **TimingOverride** | id, date, isClosed, openTime?, closeTime?, reason |
| **Announcement** | id, title, body, startsAt, endsAt, isActive |
| **ClinicSetting** | key, value (name, phones, WhatsApp, address, map link, email) |
| **Post** (optional) | id, title, slug, body, publishedAt |

Data rules:
- Collected from visitors: name, phone, patient type, age, preferred date/slot, optional non-medical note. **No diagnoses or medical history.**
- Phone numbers validated for India (10 digits, optional +91).
- Appointment data retention: configurable (default 90 days), with a cleanup script.

---

## 5. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Mobile-first** | Designed at 360px width first; breakpoints up to large desktop; touch targets at least 44px |
| **Performance** | Lighthouse mobile target: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 95+; LCP under 2.5s on 4G; images lazy-loaded and compressed (WebP/AVIF) |
| **Accessibility** | WCAG 2.1 AA: contrast, keyboard navigation, labels, focus states, reduced-motion support |
| **Security** | HTTPS, hashed passwords, JWT expiry, input validation, rate limits, no secrets in repo, dependency audit |
| **Privacy** | Minimal data collection, consent checkbox, privacy page, no third-party trackers by default |
| **Reliability** | Graceful errors, friendly empty and error states, form retry; API health endpoint |
| **Maintainability** | TypeScript throughout, ESLint/Prettier, clear folder structure, small commits |
| **Portability** | `docker compose up` runs DB + API locally; README setup under 10 minutes |
| **SEO** | Semantic HTML, meta tags, Open Graph, `LocalBusiness`/`MedicalClinic` JSON-LD, sitemap, robots.txt |
| **Browser support** | Latest Chrome, Safari (iOS), Edge, Firefox; Android Chrome |
| **Cost** | Free tiers only |

---

## 6. UX and Design Requirements
- Warm, friendly, trustworthy look suited to a clinic that treats children and adults (soft colour palette, rounded shapes, simple illustrations); not overly childish.
- Clear primary actions on every screen: **Request appointment**, **Call**, **WhatsApp**.
- Sticky bottom action bar on mobile; simple hamburger or bottom navigation.
- Large readable type (16px minimum body), plain language, short paragraphs.
- Light mode required; dark mode OPTIONAL.
- Subtle, purposeful motion only; honour `prefers-reduced-motion`.
- Admin dashboard: clean, dense-but-readable, card layout on mobile.

---

## 7. Technology Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite, React Router, Tailwind CSS, TanStack Query, React Hook Form + Zod |
| Backend | Node.js, Express, TypeScript, Zod, JWT, bcrypt, Helmet, express-rate-limit, swagger-ui-express |
| Database | PostgreSQL 16 with Prisma ORM |
| Local dev | Docker Compose (Postgres), npm workspaces monorepo |
| Testing | Vitest/Jest, Supertest, optional Playwright smoke tests |
| Hosting (free) | Vercel (web), Render (API), Neon (Postgres), Cloudflare R2 or similar for uploads (optional) |
| CI | GitHub Actions: lint, typecheck, test, build |

### Proposed repository layout
```
clinic-web/
  apps/
    api/        Express + Prisma + Swagger
    web/        React (public site + /admin)
  docs/         SRS, API notes, screenshots
  docker-compose.yml
  README.md
```

---

## 8. Optional Extensions (may or may not be built)

### 8.1 Tamil language toggle [OPTIONAL]
- English default; Tamil via a language switch in the header, remembered in local storage.
- All static UI strings in translation files (`en.json`, `ta.json`) via a lightweight i18n approach; dynamic content (services, doctors) gets optional `titleTa`/`descriptionTa` fields.
- Use a Tamil-capable open-licence font (e.g. Noto Sans Tamil).
- **Design note:** wrap all UI strings in a translation helper from the start so adding Tamil later is cheap.

### 8.2 AI chat assistant for visitor queries [OPTIONAL]
- Floating chat widget that answers common questions (timings, location, services, how to request an appointment) from clinic data.
- Constraints: **must not give medical advice or diagnoses**; show a disclaimer; for anything clinical, direct to call or visit; emergency text always shown.
- Only built if achievable at zero cost: options are a free-tier LLM API with strict rate limiting and a small system prompt fed from the services/timings API, or a rule-based FAQ matcher as a fallback with no AI cost.
- Chat messages are not stored by default; no personal data is sent to the model.
- Decision gate: implement only after core scope is complete and verified.

### 8.3 Other ideas [OPTIONAL]
Health-tip posts, CSV export, dark mode, email or WhatsApp notifications to staff on new requests, PWA install, multi-user roles.

---

## 9. Deployment and Operations
1. Create a separate demo "owner" account on each host and invite the developer as collaborator.
2. Environment variables via host dashboards; `.env.example` documents them.
3. Database migrations run on deploy; seed script for demo data.
4. Free-tier cold starts on the API: show a friendly loading state; document this in the README.
5. Demo data reset script (restore sample appointments).

---

## 10. Deliverables
1. Git repository with clean history.
2. Working API with Swagger docs.
3. React admin dashboard.
4. Public clinic website (mobile-first, responsive).
5. Deployed demo (free hosting) with a demo admin login shown in the README (fake data only).
6. README with setup steps; this SRS kept up to date.
7. Screenshots and a short screen recording for the Fiverr portfolio.

---

## 11. Milestones
| # | Milestone | Done when |
|---|---|---|
| M1 | Repo, Docker Postgres, Prisma schema, seed | `docker compose up` + `prisma migrate` + seed succeed |
| M2 | API core: auth, public endpoints, appointments | Swagger shows and exercises all endpoints; tests pass |
| M3 | Admin dashboard | Login, manage appointments and content on mobile and desktop |
| M4 | Public website | All pages, form submits end-to-end |
| M5 | Polish: a11y, SEO, performance, privacy page | Lighthouse targets met |
| M6 | Deploy and portfolio assets | Live URLs, README, screenshots, recording |
| M7 | Optional: Tamil toggle, AI assistant | Only if time allows |

---

## 12. Acceptance Criteria (summary)
- A visitor on a 360px phone can find timings, call, and submit an appointment request in under a minute.
- A submitted request appears in the admin list; staff can change its status; the change persists.
- Editing a service, timing or announcement in admin shows on the public site without redeploy.
- Invalid input is rejected with clear messages; login is protected and rate-limited.
- Swagger docs match the real API.
- A new developer can run the project locally from the README alone.

---

## 13. Open Questions / Decisions Log
| # | Item | Status |
|---|---|---|
| 1 | Final palette and logo (self-made) | Open |
| 2 | Map provider: OpenStreetMap vs Google Maps link | Open |
| 3 | Image storage for uploads (R2 vs none, using bundled images) | Open |
| 4 | Whether to build Tamil toggle and AI assistant (section 8) | Open (optional) |
| 5 | Real clinic content later (doctors, photos, timings) | Out of current scope |

## 14. Revision History
| Version | Date | Notes |
|---|---|---|
| 0.1 | 2026-11-22 | Initial draft |
