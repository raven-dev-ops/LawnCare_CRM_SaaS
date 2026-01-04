# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Google Maps API keys (browser + server)
- Stripe keys (if testing invoices and webhooks)
- Google Sheets OAuth credentials (if using Sheets import/export)
- SendGrid/Twilio credentials (optional, for notifications)

### Installation

1. Install dependencies
   ```bash
   npm install
   ```

2. Configure environment variables

   Copy the template and fill in values:
   ```bash
   cp .env.example .env.local
   ```

   Core values to run the app:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   GOOGLE_MAPS_SERVER_API_KEY=your_google_maps_server_key
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key
   ```

   Optional but recommended for local routing accuracy:
   ```env
   NEXT_PUBLIC_SHOP_LAT=38.7839
   NEXT_PUBLIC_SHOP_LNG=-90.4974
   NEXT_PUBLIC_SHOP_ADDRESS=16 Cherokee Dr, St Peters, MO
   ```

   `SUPABASE_SERVICE_ROLE_KEY` is required to accept public inquiries, run scripts, and process Stripe webhooks.

3. Run database migrations

   Push migrations to Supabase (the CLI no longer supports global npm installs, so run it through `npx` or install via another package manager per the [Supabase docs](https://github.com/supabase/cli#install-the-cli)):
   ```bash
   # Verify CLI availability
   npx supabase --version

   # Link to your project
   npx supabase link --project-ref saxtqposxmdxbcmpc

   # Push migrations
   npx supabase db push
   ```

4. Seed the database (optional)

   Seeds customers plus demo weekly routes/stops so the Dashboard and Routes pages show live data. Re-running the script clears existing customers/routes first.
   ```bash
   npm run seed
   ```

5. Start development server
   ```bash
   npm run dev
   ```

   Open http://localhost:3000

## Local URLs

- App: http://localhost:3000
- Public inquiry form: http://localhost:3000/inquiry

## Project Structure

```
src/
  app/
    (dashboard)/       # Authenticated CRM routes
    api/               # API routes (inquiries, Stripe webhook, Sheets OAuth)
    inquiry/           # Public inquiry form
    login/             # Auth routes
    layout.tsx
    globals.css
  components/
    customers/
    layout/
    ui/
  lib/
    supabase/
      admin.ts         # Service role client
      client.ts        # Browser client
      server.ts        # Server client
      middleware.ts    # Session refresh logic
    notifications.ts   # Email/SMS helpers
    settings.ts        # Business profile and notification settings
    utils.ts
  proxy.ts             # Next.js proxy entrypoint (session refresh)
  types/
    database.types.ts
scripts/
  geocode-customers.js
  generate-routes.js
  reoptimize-routes.js
supabase/
  migrations/
  seed.js

# Docs
README.md
DEVELOPMENT.md
FEATURES.md
API_REFERENCE.md
ARCHITECTURE.md
ARCHITECTURE_DIAGRAM.svg
ARCHITECTURE_DIAGRAM.png
DEPLOYMENT.md
TROUBLESHOOTING.md
ROADMAP.md
```

## Available Scripts

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript typecheck
npm run test         # Run test suite
npm run test:watch   # Watch test suite
npm run seed         # Seed database from CSV
npm run geocode      # Geocode customers with Google Maps API
npm run generate-routes  # Generate demo routes with optimization
```

Additional scripts:
- `node scripts/reoptimize-routes.js` - reoptimize existing routes and stop order

## Features Implemented

### Foundation
- Next.js 16 App Router with React 19 and TypeScript
- Tailwind CSS v4 with shadcn/ui and Radix UI
- Supabase auth, RLS, and server/client helpers

### Customer Management
- Table and map views with filters and search
- CSV import/export and Google Sheets connection
- Geocoding and route visualization

### Operations
- Routes, schedules, crew, services, and service history
- Dashboard analytics views
- Settings and configuration screens

### Inquiries and Billing
- Public inquiry form with optional reCAPTCHA
- Rate limiting and notifications (email/SMS optional)
- Invoices, line items, and payments
- Stripe checkout + webhook to record payments

## Key Technologies

- Frontend: Next.js 16, React 19, TypeScript
- Styling: Tailwind CSS v4, shadcn/ui
- Database: Supabase (PostgreSQL)
- Maps: @vis.gl/react-google-maps
- Icons: Lucide React

## Environment Variables

See `.env.example` for the full list. Additional integrations use:

```env
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Google Sheets OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SHEETS_REDIRECT_URI=http://localhost:3000/api/google-sheets/callback

# reCAPTCHA (optional - for inquiry form)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
RECAPTCHA_MIN_SCORE=0.5

# Notifications (optional)
INQUIRY_NOTIFICATION_EMAIL=
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=
INQUIRY_NOTIFICATION_PHONE=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Note: `SUPABASE_SERVICE_ROLE_KEY` is required for public inquiry submissions, Stripe webhook processing, and scripts. You can set `SUPABASE_AUTH_DISABLED=true` to bypass auth checks while running UI smoke tests or local demos without a Supabase instance.

## Auth Setup (Supabase)

1. In Supabase Dashboard > Authentication > Providers, enable Email.
2. In Authentication > URL Configuration, set:
   - Site URL: http://localhost:3000 (local dev)
   - Redirect URLs: http://localhost:3000/** and your production URL
3. Create a test user in Supabase (or invite) to sign in locally.

## Database Migrations

Migrations live in `supabase/migrations/`. Highlights include:
- Core CRM tables, routing helpers, and analytics views
- Roles and RLS policies
- Inquiry rate limits and public form protections
- Invoices, payments, and Stripe fields
- Google Sheets connections with Supabase Vault token storage

## Row Level Security (RLS)

Intended access model:
- anon: insert-only on `inquiries` via the public form.
- staff (authenticated): read/write access to CRM tables; deletes and settings changes are restricted.
- admin (authenticated): full access including deletes, settings, and imports.
- service_role: server-only; bypasses RLS for admin/background workflows (inquiries, Stripe webhooks, imports).

### Role Management

- New users default to `staff`.
- Promote an admin in Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where user_id = '<user-uuid>';
```

### RLS Regression Checklist

Using the anon key, confirm these reads are denied:
- select from `customers`
- select from `routes`
- select from `route_stops`
- select from `service_history`
- select from `inquiries`

## Testing and CI

- `npm run lint` and `npm run typecheck` run ESLint and TypeScript checks.
- `npm run test` runs Vitest smoke tests for API routes and critical UI flows.
- CI runs lint, typecheck, test, and build on every PR.

## Troubleshooting

See `TROUBLESHOOTING.md` for common issues and fixes.

## Roadmap

See `ROADMAP.md` for planned enhancements.

## Contributing

This is a client project. For questions or issues, contact the development team.