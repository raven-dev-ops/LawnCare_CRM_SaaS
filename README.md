# LawnCare CRM SaaS (GreenRoute)

A Next.js 16 (App Router) + Supabase + Google Maps CRM for lawn care businesses with customer management, route optimization, analytics, invoices, and a public inquiry form.

## Highlights
- Customer management with table/map views, filters, and CSV/Sheets import/export
- Route planning, scheduling, and Google Directions optimization with service history
- Public inquiry form with rate limiting, optional reCAPTCHA, and email/SMS notifications
- Invoices, line items, and Stripe checkout with webhook payment capture
- Analytics dashboards with KPI exports and admin audit logs
- Google Sheets OAuth integration with Supabase Vault token storage

## Connection Health
Legend: ![green](https://img.shields.io/badge/health-green) configured, ![red](https://img.shields.io/badge/health-red) missing/disabled. Update per environment.

| Connection | Health | Required env vars | Notes |
| --- | --- | --- | --- |
| Supabase (DB/Auth/Vault) | ![red](https://img.shields.io/badge/health-red) | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Required to run the app |
| Stripe (payments/webhooks) | ![red](https://img.shields.io/badge/health-red) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Required for invoicing and payments |
| Google Maps (routing/UI) | ![red](https://img.shields.io/badge/health-red) | `GOOGLE_MAPS_SERVER_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Required for maps and routing |
| Google Sheets (OAuth) | ![red](https://img.shields.io/badge/health-red) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_SHEETS_REDIRECT_URI` | Used for import/export |
| reCAPTCHA (inquiry form) | ![red](https://img.shields.io/badge/health-red) | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` | Optional |
| SendGrid email (notifications) | ![red](https://img.shields.io/badge/health-red) | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `INQUIRY_NOTIFICATION_EMAIL` | Optional |
| Twilio SMS (notifications) | ![red](https://img.shields.io/badge/health-red) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `INQUIRY_NOTIFICATION_PHONE` | Optional |

## Connection Health
Legend: ![green](https://img.shields.io/badge/health-green) configured, ![red](https://img.shields.io/badge/health-red) missing/disabled. Update per environment.

| Connection | Health | Required env vars | Notes |
| --- | --- | --- | --- |
| Supabase (DB/Auth/Vault) | ![red](https://img.shields.io/badge/health-red) | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Required to run the app |
| Stripe (payments/webhooks) | ![red](https://img.shields.io/badge/health-red) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Required for invoicing and payments |
| Google Maps (routing/UI) | ![red](https://img.shields.io/badge/health-red) | `GOOGLE_MAPS_SERVER_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Required for maps and routing |
| Google Sheets (OAuth) | ![red](https://img.shields.io/badge/health-red) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_SHEETS_REDIRECT_URI` | Used for import/export |
| reCAPTCHA (inquiry form) | ![red](https://img.shields.io/badge/health-red) | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` | Optional |
| SendGrid email (notifications) | ![red](https://img.shields.io/badge/health-red) | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `INQUIRY_NOTIFICATION_EMAIL` | Optional |
| Twilio SMS (notifications) | ![red](https://img.shields.io/badge/health-red) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `INQUIRY_NOTIFICATION_PHONE` | Optional |

## Local URLs
- App: http://localhost:3000
- Public inquiry form: http://localhost:3000/inquiry

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required Supabase values (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and set `NEXT_PUBLIC_APP_URL`. Add Google Maps keys for routing/map views. `SUPABASE_SERVICE_ROLE_KEY` is required for public inquiry rate limiting, scripts, and Stripe webhooks.

3. Set up Supabase and apply migrations:
   ```bash
   npx supabase db push
   ```
   Optional demo data:
   ```bash
   npm run seed
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Integrations Setup

1. Apply the latest Supabase migrations:
   ```bash
   npx supabase db push
   ```
   This creates the `invoices`, `invoice_line_items`, `payments`, and `google_sheets_connections` tables.

2. Add required environment variables (local example, include the integrations you plan to use):
   ```bash
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GOOGLE_MAPS_SERVER_API_KEY=your_google_maps_server_key
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   GOOGLE_SHEETS_REDIRECT_URI=http://localhost:3000/api/google-sheets/callback
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
   RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
   INQUIRY_NOTIFICATION_EMAIL=ops@example.com
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=notifications@example.com
   SENDGRID_FROM_NAME=Lawn Care CRM
   INQUIRY_NOTIFICATION_PHONE=+15551234567
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_FROM_NUMBER=+15557654321
   ```
   Use your deployed URL for `NEXT_PUBLIC_APP_URL` and the Google Sheets redirect URI in production.
   The service role key is required to accept inquiries and to record Stripe webhook payments.

3. Configure and connect Google Sheets:
   - Add the redirect URI to your OAuth client in Google Cloud Console.
   - In the app, go to Customers -> Import/Export -> Google Sheets.
   - Click Connect, then load a sheet by URL/ID, and switch to Import to map fields.
   - Share the sheet with the Google account used for OAuth.
   - Tokens are stored using Supabase Vault once connected.

4. Configure Stripe webhooks:
   - Add an endpoint in Stripe: `https://<your-domain>/api/stripe/webhook` (local: `http://localhost:3000/api/stripe/webhook`).
   - Subscribe to `checkout.session.completed` and `payment_intent.succeeded` events.

5. Optional: configure reCAPTCHA and notification providers:
   - reCAPTCHA: set site and secret keys, and tune `RECAPTCHA_MIN_SCORE` if using v3.
   - SendGrid/Twilio: set the notification targets and provider credentials.

Stripe checkout sessions are created from the invoice detail page. Successful webhook events create `payments` records and update invoice totals/status. Manual payment entry is still available.

## Documentation

- `DEVELOPMENT.md` - local dev, Supabase migrations, seeding, scripts
- `FEATURES.md` - feature and UI walkthrough
- `MIGRATION_GUIDE.md` - Google Sheets to CRM migration steps
- `ARCHITECTURE.md` - system overview and data flow
- `ARCHITECTURE_DIAGRAM.svg` - visual architecture overview
- `ARCHITECTURE_DIAGRAM.png` - diagram export for presentations
- `API_REFERENCE.md` - API routes and payloads
- `DEPLOYMENT.md` - production setup checklist
- `DEPLOYMENT_LOG.md` - deployment validation records
- `TROUBLESHOOTING.md` - common issues and fixes
- `ROADMAP.md` - planned enhancements
- `BACKLOG_REVIEW.md` - SOW-to-repo backlog mapping
- `RELEASE_PLAN.md` - staging to production release flow
- `CONTRIBUTING.md` - contribution guidelines
- `SECURITY.md` - security policy
- `SECURITY_REVIEW.md` - security review log
- `VALIDATION.md` - migration and RLS validation log
- `CHANGELOG.md` - release notes
- `RELEASE_CHECKLIST.md` - release steps
- `PERFORMANCE.md` - performance baseline notes
- `ACCESS.md` - access provisioning and owners
- `MONITORING.md` - monitoring and logging runbook
- `METRICS.md` - KPI definitions and targets
- `UAT_CHECKLIST.md` - acceptance test checklist
- `HANDOFF.md` - operations handoff guide
- `supabase/migrations/` - database schema + RLS policies

## Row Level Security (RLS)

- `anon`: insert-only on `inquiries` via the public form; no reads from CRM tables.
- `authenticated`: full read/write access to CRM tables and settings.
- `service_role`: server-only; bypasses RLS for admin/background workflows (inquiries rate limiting, Stripe webhooks, background sync).

## Scripts

- `npm run dev` - start dev server (Turbopack)
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - ESLint
- `npm run typecheck` - TypeScript typecheck
- `npm run test` - run test suite
- `npm run test:watch` - watch test suite
- `npm run test:e2e` - Playwright E2E tests
- `npm run test:e2e:screenshots` - capture UI screenshots (desktop + mobile)
- `npm run seed` - seed demo data
- `npm run geocode` - geocode customers (scripted)
- `npm run generate-routes` - generate demo routes (scripted)

## Testing

Vitest covers API routes and UI smoke tests in `tests/`. Playwright E2E runs the main UI flows and captures desktop/mobile screenshots in `tests/e2e/screenshots`. Run `npm run test` and `npm run test:e2e` (or `npm run test:e2e:screenshots` for UI captures) during development.

## Deployment

See `DEPLOYMENT.md` for production setup, environment variables, and third-party integrations.

## Security

See `SECURITY.md`.

## License

All rights reserved. See `LICENSE.md`.
