# Deployment guide

Three free services, all created under one **owner** identity:

```
Browser ──► Vercel (React site, apps/web) ──► Render (API in Docker, apps/api) ──► Neon (PostgreSQL)
                                                  └─► Twilio (WhatsApp) / Resend (email), optional
```

Nothing secret is ever committed. Secrets live only in the Render, Vercel and Neon dashboards.

---

> **Using your own accounts instead?** Then you are the owner. Skip section 0 and the "invite a collaborator" steps: sign up to Neon, Render and Vercel with your own GitHub login (`mito-1315`), and everything below works the same. The repository is `https://github.com/mito-1315/clinic-web`.

## 0. How the owner account works

**One "owner" identity holds everything.** Make a fresh email for it (for example `lakshmi.clinic.demo@gmail.com`) with two-step verification on. Use it to create:

1. a **GitHub** account (the code lives here),
2. a **Neon**, **Render** and **Vercel** account, all signed up with "Continue with GitHub" so they can read the repository.

Why this way: the demo stays separate from your personal accounts, and if a real clinic ever takes it over you hand over one login (or transfer the repository) instead of untangling your own accounts.

**Where you fit in**

| Who | Does what |
|---|---|
| **Owner** (logged in once) | Creates the repo, the database, the Render service and the Vercel project. Types the secrets into the dashboards. |
| **You** (a GitHub collaborator with *Write* access) | Push code to `main` from your computer. Render and Vercel notice the push and **redeploy by themselves**. |

So day to day you never need the owner's Render or Vercel password. You only need the owner login to **change environment variables, read server logs, or manage billing**.

Things to know before you rely on this:

- **Collaborators on the free plans.** Render and Vercel free accounts are single-user; adding teammates to their dashboards can need a paid plan (check their pricing pages, it changes). GitHub collaborators are free. That is why access goes through GitHub.
- **Vercel and private repos.** Vercel's free Hobby plan may refuse to deploy a collaborator's commits on a **private** repository. If that happens, either make the repository **public** (nothing secret is in it), or have the owner push or merge to `main`.
- **Share nothing by chat.** Never send passwords, the Neon connection string, Twilio tokens or the JWT secret in a message. Type them into the dashboard yourself.
- **Showing it to clients.** On Fiverr, give only the public site link and, if you want, the API docs link. Never give a dashboard login.

---

## 1. Accounts to create (owner)

| Service | Used for | Free? |
|---|---|---|
| GitHub | Code, and the trigger for automatic deploys | Yes |
| Neon (neon.tech) | PostgreSQL database | Yes |
| Render (render.com) | The API | Yes (sleeps when idle) |
| Vercel (vercel.com) | The website | Yes |
| Twilio, Resend (optional) | WhatsApp and email alerts | Trial credit / free tier |
| cron-job.org (optional) | Wakes the API for reminders | Yes |

---

## 2. Put the code on GitHub

**Owner:** create an empty repository named `clinic-web` (no README, no .gitignore). Then *Settings → Collaborators → Add people* and add your own GitHub username with **Write** access. You accept the invitation by email.

**You**, in the project folder:

```powershell
git remote add origin https://github.com/<owner-username>/clinic-web.git
git branch -M main
git push -u origin main
```

Git asks you to sign in. Use your own GitHub login (a personal access token if it asks for a password).

---

## 3. Database (Neon)

1. Owner: **Create project**. Pick the **Singapore** region (closest to Chennai) and Postgres 16.
2. On the project page choose **Connect**, turn **Connection pooling off**, and copy the connection string. It looks like `postgresql://…neon.tech/neondb?sslmode=require`. Keep it private.
3. Create the tables and load the demo data **once**, from your computer. The string is used for this one command only and is not saved anywhere:

```powershell
$env:DATABASE_URL = "paste the Neon string here"
$env:CONFIRM_SEED = "yes"
npm run db:deploy
Remove-Item Env:DATABASE_URL, Env:CONFIRM_SEED
```

`db:deploy` runs the database migrations and then the seed. The seed **deletes and recreates** the demo content, so it refuses to run against a hosted database without `CONFIRM_SEED=yes`. Run it once. Later schema changes are applied automatically every time the API starts.

---

## 4. API (Render)

1. Owner: **New → Blueprint**, pick the `clinic-web` repository. Render reads `render.yaml` and creates the `clinic-api` service (Docker, free plan, Singapore).
2. Render asks for two values:
   - `DATABASE_URL`: the Neon string from step 3.
   - `CORS_ORIGIN`: type `https://placeholder.vercel.app` for now. You fix it in step 5.
3. `JWT_SECRET` and `CRON_SECRET` are generated for you. `ENABLE_DOCS` is `true`, so the API docs page is public (right for a portfolio, turn it off for a real clinic).
4. Wait for the first deploy, then open `https://<your-service>.onrender.com/api/v1/health`. It should say `{"status":"ok"}`. The docs are at `/api/docs`.

The free plan **sleeps after about 15 minutes of no traffic**. The first request afterwards takes 30 to 60 seconds. That is normal.

---

## 5. Website (Vercel)

1. Owner: **Add New → Project**, import `clinic-web`.
2. **Root Directory:** `apps/web`. Vercel detects Vite; leave the build command (`npm run build`) and output (`dist`).
3. **Environment Variables:** `VITE_API_URL` = your Render address, for example `https://clinic-api-xxxx.onrender.com` (no slash at the end).
4. **Deploy.**
5. Copy the production address Vercel gives you (like `https://clinic-web-xxxx.vercel.app`).
6. Go back to **Render → clinic-api → Environment** and set `CORS_ORIGIN` to that address. Several addresses can be separated by commas. Save; Render redeploys. Without this step the site loads but every API call is blocked by the browser.

Vercel "preview" deployments get different addresses, so the API rejects them unless you add them to `CORS_ORIGIN`. That is intended.

---

## 6. Test it on the deployment

Open the Vercel address and go through this list. The first API call may take a minute while Render wakes up.

- [ ] Home page loads; services gallery and doctors scroll sideways; doctor photos show.
- [ ] Open the browser console (F12). There should be **no red "Refused to load…" messages**. The site sends a strict Content-Security-Policy that I could only test locally, so this check matters. If you see any, copy them to me.
- [ ] Booking form: send a request; you get a reference code.
- [ ] Track page: the code plus the phone number shows the status.
- [ ] `/admin`: sign in with the demo login. Requests, Services, Doctors, Alerts all open.
- [ ] Confirm the request in the admin and watch the Track page change.
- [ ] Phone: open the site on your phone and check the booking form and the gallery.
- [ ] `https://<api>/api/docs` shows the docs; `https://<api>/api/v1/admin/stats` says 401.

---

## 7. Optional: real WhatsApp and email

In **Render → Environment**, add (values come from Twilio and Resend, never from git):

| Name | Value |
|---|---|
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio console home |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+<your sandbox number>` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend (`onboarding@resend.dev` until you own a domain) |
| `NOTIFY_PHONE`, `NOTIFY_EMAIL` | optional fallbacks; the admin **Alerts** page sets the real ones |

Then in the admin **Alerts** page set the staff WhatsApp number and email, and press **Send test alert**. Twilio trial limits (sandbox join code, verified numbers) are explained on that page.

**Reminders when the API sleeps.** The in-app reminder timer stops while Render sleeps. Fix with a free pinger: on cron-job.org create a job that calls

```
GET https://<api>.onrender.com/api/v1/cron/reminders
header  x-cron-key: <the CRON_SECRET value from Render's Environment tab>
```

every 30 minutes. It also wakes the API and runs the 90-day data cleanup.

---

## 8. Day-to-day and going live for a real clinic

- **Update the site:** commit, `git push`. Render and Vercel redeploy automatically. Database changes (migrations) apply at API start.
- **Roll back:** Render and Vercel both have a "Rollback" button on a previous deploy.
- **Real admin account** (against the hosted database, like step 3):
  ```powershell
  $env:DATABASE_URL = "the Neon string"
  $env:ADMIN_PASSWORD = "a password of your own, 10+ characters"
  $env:REMOVE_DEMO = "yes"
  npm run admin:create -- you@example.com "Your Name"
  Remove-Item Env:DATABASE_URL, Env:ADMIN_PASSWORD, Env:REMOVE_DEMO
  ```
  It creates the account, then deletes the public demo account. Change the password later in **Admin → Settings → Change password**.
- **Retire the demo login:** `DISABLE_DEMO_LOGIN` is already `true` on Render and the sign-in page no longer shows the demo credentials. Also consider `ENABLE_DOCS=false`, and replace the sample photos, names, phone number and testimonials.
- **Custom domain:** add it in Vercel, then add the new address to `CORS_ORIGIN` on Render.

## 9. If something goes wrong

| Symptom | Likely cause and fix |
|---|---|
| Site loads, forms say "Cannot reach the server" | `CORS_ORIGIN` on Render does not match the Vercel address, or the API is still waking. Check the address, wait a minute. |
| Everything calls `/api` on the Vercel domain and 404s | `VITE_API_URL` was not set before the build. Set it in Vercel and redeploy. |
| "Something went wrong" from the API | The database address is wrong or Neon was waking. Check `DATABASE_URL`; read Render's logs. |
| API will not start, mentions `JWT_SECRET` | The secret is short or a placeholder. Let Render generate it, or run `bash scripts/gen-jwt-secret.sh` and paste the result. |
| Fonts, map or images missing, console shows "Refused to load" | Content-Security-Policy in `apps/web/vercel.json` is blocking something. Send me the console lines. |
| First visit takes a minute | Render free plan was asleep. Use the cron-job.org ping, or accept it. |
| WhatsApp or email shows Failed in Alerts | The red text under the message names the cause. See the Twilio notes in the README. |
