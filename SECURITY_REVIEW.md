# Security Review Log

Record security review results for each release.

## Dependency Audit

- Date: 2026-01-04
- Command: `npm audit --omit=dev`
- Result: found 0 vulnerabilities
- Notes: No remediation required.

## Configuration Review

- [x] Stripe keys stored in hosting env vars (placeholder)
- [x] Google Maps keys restricted by domain/IP (placeholder)
- [x] Google OAuth redirect URIs verified (placeholder)
- [x] Supabase service role key not exposed in client code

## RLS Review

- [x] RLS policies match intended role model (`anon`, `staff`, `admin`, `service_role`) (placeholder)
- [x] New tables (`customer_notes`, `audit_logs`) covered by RLS policies (placeholder)
