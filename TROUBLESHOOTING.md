# Troubleshooting

## Build or runtime errors

Problem: "Supabase environment variables are not set"
- Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or public variants) in `.env.local`.
- Restart the dev server after changes.

Problem: `npm run build` fails in CI with missing env vars
- CI does not need runtime env vars for build, but some imports may access them at module scope. Ensure env access happens inside request handlers or set temporary values in CI if needed.

## Public inquiry form issues

Problem: `/api/inquiries` returns 429 immediately
- `SUPABASE_SERVICE_ROLE_KEY` is missing; rate limiting fails closed.
- Set the key in `.env.local` and redeploy.

Problem: reCAPTCHA always fails
- Ensure `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` matches the site, and `RECAPTCHA_SECRET_KEY` matches the same reCAPTCHA project.
- Check `RECAPTCHA_MIN_SCORE` if using v3.

## Stripe webhook issues

Problem: Webhook returns 400 (missing/invalid signature)
- Confirm `STRIPE_WEBHOOK_SECRET` matches the endpoint.
- Do not parse the body before verification; the route uses `request.text()`.

Problem: Payments not recorded
- Confirm invoices include `invoice_id` metadata when creating checkout sessions.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set.

## Google Sheets connection issues

Problem: Redirect shows `googleSheets=config_missing`
- Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_SHEETS_REDIRECT_URI`.

Problem: Redirect shows `googleSheets=auth_required` or `admin_required`
- Sign in and ensure your profile role is `admin`.

## Maps and routing issues

Problem: Map is blank or shows errors
- Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `GOOGLE_MAPS_SERVER_API_KEY`.
- Verify the Maps JavaScript, Directions, Places, and Geocoding APIs are enabled.

Problem: Route optimization fails
- Google Directions allows up to 23 waypoints; larger routes fall back to nearest-neighbor.
- Ensure customers have latitude/longitude values (run `npm run geocode`).

## Scripts fail

Problem: `npm run seed` or `npm run geocode` exits early
- These scripts require `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL`.
- `npm run geocode` also needs `GOOGLE_MAPS_SERVER_API_KEY`.

## Need more help?

- Review `DEVELOPMENT.md` for local setup.
- Check `API_REFERENCE.md` for endpoint expectations.