# Deployment Guide

This app is a standard Next.js 16 deployment. Vercel is the simplest option, but any Node hosting provider works as long as environment variables are set.

## 1) Provision Supabase

1. Create a Supabase project.
2. Set environment variables locally or in your host (see below).
3. Apply migrations:
   ```bash
   npx supabase db push
   ```
4. Configure Auth:
   - Authentication > URL Configuration
   - Site URL: `https://your-domain`
   - Redirect URLs: `https://your-domain/**`

## 2) Configure Environment Variables

Required for production:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (inquiries, scripts, Stripe webhooks)
- `NEXT_PUBLIC_APP_URL` (base URL, no trailing slash)
- `GOOGLE_MAPS_SERVER_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Optional but recommended:
- `NEXT_PUBLIC_SHOP_LAT`, `NEXT_PUBLIC_SHOP_LNG`, `NEXT_PUBLIC_SHOP_ADDRESS`
- `RECAPTCHA_SECRET_KEY` and `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- `RECAPTCHA_MIN_SCORE` (defaults to 0.5)
- `INQUIRY_NOTIFICATION_EMAIL`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`
- `INQUIRY_NOTIFICATION_PHONE`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

Stripe (if using invoices and payment capture):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Google Sheets (if using Sheets import/export):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_SHEETS_REDIRECT_URI`

## 3) Configure Stripe Webhooks (Optional)

1. Create a webhook endpoint in Stripe:
   - `https://your-domain/api/stripe/webhook`
2. Subscribe to events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

## 4) Configure Google Sheets OAuth (Optional)

1. Create OAuth credentials in Google Cloud Console.
2. Add redirect URI:
   - `https://your-domain/api/google-sheets/callback`
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_SHEETS_REDIRECT_URI`.

## 5) Deploy the App

### Vercel
1. Import the repo and set environment variables.
2. Deploy the project (build command: `npm run build`).
3. Confirm runtime uses Node 20+.

### Other Hosts
1. Build: `npm run build`.
2. Start: `npm run start`.
3. Ensure Node 18+ and environment variables are set.

## 6) Post-Deploy Checklist

- Verify login at `/login`.
- Submit a test inquiry at `/inquiry`.
- Confirm Google Maps renders on Customers and Routes.
- If using Stripe, run a test checkout and confirm webhook payment ingestion.
- If using Google Sheets, connect a sheet and import a sample row.

## Troubleshooting

See `TROUBLESHOOTING.md` for common deployment issues.