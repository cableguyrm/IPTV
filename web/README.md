# BTN TV STREAMZ — IPTV Reseller Marketplace & Subscription Manager

A database-backed reseller marketplace and business-management platform: panel listings and comparison, wholesale credit sales (AED / PHP / USD), reseller accounts with a customer & subscription tracker, support desk, and a role-based admin dashboard.

> **Compliance:** the platform is built to list and distribute only services for which the business holds the necessary licensing or authorisation. Panel content counts are shown only when an admin marks them *verified*, subscriptions are never activated without either an authorised provider API or an administrator's confirmation, and orders are never marked paid without provider confirmation or admin verification of a bank transfer.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS 3 (custom jet/crimson/silver theme, glassmorphism, neon glow) |
| Database | PostgreSQL 16 via Drizzle ORM (SQL migrations in `drizzle/`) |
| Auth | Email + password (bcrypt cost 12), DB-backed sessions (SHA-256 hashed tokens, httpOnly cookies), password reset tokens |
| Payments | Stripe Checkout (cards, Apple Pay, Google Pay) + bank transfer / GCash / Maya with manual verification |
| Notifications | SMTP email (nodemailer), WhatsApp Cloud API templates |

## Quick start (local)

```bash
cd web
cp .env.example .env            # then edit values (see below)
npm install
npm run db:migrate              # create tables
npm run db:seed                 # optional: clearly-labelled SAMPLE data + admin from ADMIN_EMAIL/ADMIN_PASSWORD
npm run dev                     # http://localhost:3000
```

Or with Docker: `docker compose up --build` (runs migrations on start; seed with `docker compose exec web npm run db:seed`).

### Administrator login setup

1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (10+ chars) in `.env`.
2. Run `npm run admin:create`. Re-running it resets that admin's password and re-activates the account.
3. Sign in at `/login` → you land on `/admin`.
4. Promote other users to **Administrator** or **Staff** from *Admin › Resellers › Manage › Role*.

Roles: **ADMIN** – everything. **STAFF** – support tickets, trials, inquiries, approving/rejecting activation requests, read-only reseller views. **RESELLER** – the `/dashboard` area for their own data only.

### Sample data

`npm run db:seed` creates panels, plans, credit packages, FAQs, a sample reseller (`reseller@sample.btntv.test` / `SampleReseller1`), a pending application, customers, subscriptions, a trial request, inquiry and ticket. Every sample record is flagged (`is_sample`, “Sample” names, *Sample data* badges). Edit or delete them in the admin dashboard, or wipe and recreate with `npm run db:seed -- --reset`. **Do not seed production.**

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`DATABASE_SSL=true` for managed DBs needing TLS) |
| `APP_URL` | Public base URL (emails, Stripe redirects) |
| `APP_SECRET` | Long random string |
| `CRON_SECRET` | Bearer token for `/api/cron/renewals` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used by `admin:create` / seed |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Card & wallet payments |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Password resets, renewal reminders, admin alerts |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE` | WhatsApp renewal reminders |
| `PROVIDER_GENERIC_BASE_URL`, `PROVIDER_GENERIC_API_KEY` | Optional IPTV provider API adapter |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN`, `NEXT_PUBLIC_ANALYTICS_SRC` | Optional cookie-less Plausible-compatible analytics |

Non-secret business settings (branding, logo, hero/about text, contact numbers, exchange rates, bank details, reminder schedule) are edited in **Admin › Site settings** and stored in the `settings` table. Admin › Site settings also shows which integrations are configured.

## Integrations

### Payments (Stripe — cards, Apple Pay, Google Pay)
1. Create a Stripe account for the business entity (Stripe supports the UAE; enable AED/PHP/USD presentment).
2. Set `STRIPE_SECRET_KEY`.
3. Add a webhook endpoint `https://YOUR_DOMAIN/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

Card orders are credited **only** by the signature-verified webhook, after checking amount and currency match the order. Fulfilment is idempotent (row lock + `credited_at`), so retries never double-credit. Card checkout is hidden until both Stripe variables are set.

For Philippine wallets without a Stripe integration (GCash/Maya), use the bank-transfer flow: the reseller sees your account/wallet instructions, submits a reference, and an admin verifies it in **Admin › Payments & invoices**, which credits the account and emails the reseller. Additional gateways (e.g. PayMongo, Telr, Network International) can be added alongside `src/lib/stripe.ts` + a webhook route following the same pattern.

### IPTV provider APIs
Each panel has a **Provider integration** setting (Admin › Panels):
- **Manual (default):** reseller requests are queued as *Pending*. An admin creates the line on the provider panel, then clicks *Approve & deduct* — credits are deducted and the subscription activated atomically. Rejections cost nothing.
- **Generic REST:** set `PROVIDER_GENERIC_BASE_URL`/`PROVIDER_GENERIC_API_KEY` and choose *Generic REST provider API*. Activation deducts credits, calls the provider, and refunds automatically if the provider fails. Adapt `src/lib/provider.ts` to your provider's documented API (add a new adapter to the `ADAPTERS` map). If credentials are missing the panel silently falls back to manual.

Only configure an adapter for a provider you are authorised to resell.

### Email & WhatsApp reminders
- Configure SMTP for email. Without it, emails are skipped (in development they are printed to the server console, which is how you can grab password-reset links locally).
- WhatsApp uses the Meta Cloud API with a pre-approved template whose body takes 4 parameters: customer name, panel, expiry date, reseller name.
- Reminders go only to customers with reminders enabled on their record, for subscriptions with *Send renewal reminders* on, at the days configured in settings (default 7, 3, 1). Every attempt is logged per subscription.
- Schedule daily: `curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/renewals` (system cron, GitHub Actions, Vercel Cron, etc.). Admins can also run it from *Admin › Site settings*.

## Deployment

**Any Node host / VPS:** Node 20+, PostgreSQL 14+. `npm ci && npm run build && npm run db:migrate && npm start` behind a TLS-terminating reverse proxy (nginx/Caddy). Set `APP_URL` to the https URL.

**Docker:** `docker compose up -d --build` (see `docker-compose.yml`), then `docker compose exec web npm run admin:create`.

**Vercel + managed Postgres (Neon / Supabase / RDS):** import the `web/` directory as the project root, set the env vars, run `npm run db:migrate` once against the production database, and add a Vercel Cron for `/api/cron/renewals`. Note: the login/registration rate limiter is in-memory per instance — for multi-instance deployments back `src/lib/rate-limit.ts` with Redis/Upstash.

Production checklist: strong `APP_SECRET`/`CRON_SECRET`, real legal text (the legal pages are templates), replace sample bank details and contact numbers, delete sample data, configure SMTP, back up the database.

## Database schema

Defined in `src/db/schema.ts`; generated SQL in `drizzle/0000_init.sql`. After changing the schema run `npm run db:generate` then `npm run db:migrate`.

| Table | Purpose |
|---|---|
| `users` | Admins, staff and resellers (role, status, credit balance, application details) |
| `sessions`, `password_resets` | Hashed session and reset tokens |
| `panels`, `plans` | Panel listings (verified flags, devices, credit system, provider adapter) and their subscription plans |
| `credit_packages` | Wholesale packages: USD price + optional AED/PHP overrides |
| `customers` | Reseller-owned end customers and reminder preferences |
| `subscriptions` | Customer subscriptions (status, provisioning mode, activation/expiry, renewals, notes) |
| `customer_payments` | Payments resellers record from their customers |
| `reminder_logs` | Every renewal reminder attempt |
| `orders` | Credit purchases (method, status, provider/bank references, verification) |
| `credit_ledger` | Immutable record of every credit change with balance-after and actor |
| `audit_logs` | Sensitive actions with actor, entity, metadata and IP |
| `trial_requests`, `inquiries` | Leads |
| `tickets`, `ticket_messages`, `ticket_attachments` | Support desk (attachments stored in Postgres, validated by magic bytes, max 3 × 3 MB) |
| `faqs`, `settings` | Editable content and configuration |

## Security notes

- Passwords: bcrypt (cost 12); sessions are random 256-bit tokens stored as SHA-256 hashes; password change/reset revokes other sessions.
- Server Actions are origin-checked by Next.js (CSRF); every action re-checks the caller's role and record ownership.
- Zod validation on all inputs; parameterised SQL via Drizzle; CSV exports neutralise spreadsheet formula injection.
- Rate limits on login, registration, password reset, contact/trial/ticket forms and orders; honeypot fields on public forms.
- Credits can't go negative (conditional atomic update) and every change is written to the ledger and audit log.
- Security headers (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy); attachments served with a restrictive CSP and only to the ticket owner, staff, or a guest holding the ticket's secret link.
- The IPTV Tools (M3U/Xtream parser) run entirely in the browser — credentials are never sent to or logged by the server. The speed-test endpoint discards uploaded bytes.

## Project layout

```
web/
  src/app/(site)/        public pages (home, panels, compare, pricing, tools, guide, support, auth, legal…)
  src/app/dashboard/     reseller area
  src/app/admin/         admin area
  src/app/actions/       server actions (auth, public, reseller, admin, tickets)
  src/app/api/           webhooks, cron, CSV export, attachments, speed test
  src/lib/               auth, credits, orders, subscriptions, provider adapters, currency, settings, notifications
  src/db/                Drizzle schema + client
  scripts/               migrate, seed, create-admin
  drizzle/               SQL migrations
```
