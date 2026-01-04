# API Reference

All endpoints live under `/api` and return JSON unless noted. The CRM UI uses Supabase directly; these API routes handle public inquiries, Stripe webhooks, and Google Sheets OAuth.

## POST /api/inquiries

Public endpoint for inquiry submissions.

### Request Body
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "555-123-4567",
  "address": "123 Main St, St Peters, MO",
  "propertyType": "Residential",
  "lotSize": "0.25 acres",
  "servicesInterested": ["Mowing", "Edging"],
  "preferredContactMethod": "email",
  "preferredContactTime": "Weekdays after 4pm",
  "notes": "Gate code is 1234.",
  "recaptchaToken": "token-from-client",
  "honeypot": ""
}
```

### Field Notes
- `propertyType`: `Residential`, `Commercial`, or `Other`
- `preferredContactMethod`: `email`, `phone`, or `text`
- `servicesInterested`: array of up to 12 strings
- `recaptchaToken` is optional; if `RECAPTCHA_SECRET_KEY` is set, it is validated
- `honeypot` should be left empty by real users

### Responses
- `201` `{ "success": true }`
- `400` invalid payload or spam rejection
- `429` rate limited (includes `Retry-After` header)
- `500` insert failure

### Requirements
- `SUPABASE_SERVICE_ROLE_KEY` must be set or requests will fail closed with `429`.

## GET /api/google-sheets/callback

OAuth callback for Google Sheets connection. This endpoint redirects; it does not return JSON.

### Query Params
- `code` (required unless `error` is present)
- `error` (optional)

### Behavior
- Requires a signed-in user with `admin` role.
- Stores tokens in Supabase Vault via RPCs.
- Redirects to `/customers` with a query flag:
  - `googleSheets=connected`
  - `googleSheets=error`
  - `googleSheets=missing_code`
  - `googleSheets=config_missing`
  - `googleSheets=auth_required`
  - `googleSheets=admin_required`
  - `googleSheets=save_failed`
  - `googleSheets=token_error`

### Requirements
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_SHEETS_REDIRECT_URI` must be configured.

## POST /api/stripe/webhook

Stripe webhook endpoint for payment updates.

### Headers
- `stripe-signature`: required

### Behavior
- Verifies the webhook signature using `STRIPE_WEBHOOK_SECRET`.
- Handles events:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
- Inserts a payment and updates invoice totals and status.

### Responses
- `200` `{ "received": true }`
- `400` missing/invalid signature
- `500` misconfiguration or handler failure

### Requirements
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` must be set.

## GET /api/analytics/export

Exports analytics data as CSV. Admin access required.

### Query Params
- `type`: `kpis` (default), `route-stats`, or `service-history`
- `start`: `YYYY-MM-DD` (optional date filter)
- `end`: `YYYY-MM-DD` (optional date filter)

### Responses
- `200` CSV download
- `403` admin access required

## Notes

- API routes run on the server and can use the service role key.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code.
