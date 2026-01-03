# LawnCare CRM SaaS (GreenRoute)

A Next.js (App Router) + Supabase + Google Maps CRM for lawn care businesses: manage customers, routes, schedules, inquiries, and basic analytics.

This repository is source-available for authorized use only (see `LICENSE.md`).

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Set up Supabase + run migrations (see `DEVELOPMENT.md`).

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Documentation

- `DEVELOPMENT.md` — local dev, Supabase migrations, seeding
- `FEATURES.md` — feature/UI walkthrough
- `supabase/migrations/` — database schema + RLS policies

## Scripts

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — ESLint
- `npm run seed` — seed demo data
- `npm run geocode` — geocode customers (scripted)
- `npm run generate-routes` — generate demo routes (scripted)

## Security

See `SECURITY.md`.

## License

All rights reserved. See `LICENSE.md`.
