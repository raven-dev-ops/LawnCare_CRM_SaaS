# LawnCare CRM SaaS (GreenRoute)

A Next.js 16 (App Router) + Supabase + Google Maps CRM for lawn care businesses with customer management, route optimization, analytics, invoices, and a public inquiry form.

## Highlights
- Customer management with table and map views, filters, and CSV/Sheets import
- Route planning, scheduling, and service history tracking
- Public inquiry form with rate limiting, optional reCAPTCHA, and notifications
- Invoices, line items, and Stripe checkout with webhook payment capture
- Google Sheets integration with Supabase Vault token storage

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
   Fill in the required Supabase values (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and set `NEXT_PUBLIC_APP_URL`. `SUPABASE_SERVICE_ROLE_KEY` is required for public inquiry rate limiting and Stripe webhooks.

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

## Integrations Setup (Invoices + Google Sheets)

1. Apply the latest Supabase migrations:
   ```bash
   npx supabase db push
   ```
   This creates the `invoices`, `invoice_line_items`, `payments`, and `google_sheets_connections` tables.

2. Add required environment variables (local example):
   ```bash
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   GOOGLE_SHEETS_REDIRECT_URI=http://localhost:3000/api/google-sheets/callback
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

Stripe checkout sessions are created from the invoice detail page. Successful webhook events create `payments` records and update invoice totals/status. Manual payment entry is still available.

## Documentation

- `DEVELOPMENT.md` - local dev, Supabase migrations, seeding, scripts
- `FEATURES.md` - feature and UI walkthrough
- `MIGRATION_GUIDE.md` - Google Sheets to CRM migration steps
- `ARCHITECTURE.md` - system overview and data flow
- `ARCHITECTURE_DIAGRAM.svg` - visual architecture overview
- `API_REFERENCE.md` - API routes and payloads
- `DEPLOYMENT.md` - production setup checklist
- `TROUBLESHOOTING.md` - common issues and fixes
- `ROADMAP.md` - planned enhancements
- `CONTRIBUTING.md` - contribution guidelines
- `SECURITY.md` - security policy
- `CHANGELOG.md` - release notes
- `RELEASE_CHECKLIST.md` - release steps
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
- `npm run seed` - seed demo data
- `npm run geocode` - geocode customers (scripted)
- `npm run generate-routes` - generate demo routes (scripted)

## Testing

Smoke tests live in `tests/` and cover API routes plus the login UI. Run `npm run test` (or `npm run test:watch`) during development.

## Deployment

See `DEPLOYMENT.md` for production setup, environment variables, and third-party integrations.

## Security

See `SECURITY.md`.

## License

All rights reserved. See `LICENSE.md`.