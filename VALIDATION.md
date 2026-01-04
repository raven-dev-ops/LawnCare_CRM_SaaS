# Validation Log

Use this document to record migration and RLS validation results.

## Migration Validation

- Supabase project ref: <project-ref>
- Supabase anon key: <anon-key>
- Date: 2026-01-04 (placeholder)
- Supabase project: placeholder
- `npx supabase db push` result: placeholder
- Notes: Placeholder entry; replace after real validation.

## RLS Regression Checklist

- [x] anon cannot select from `customers` (placeholder)
- [x] anon cannot select from `routes` (placeholder)
- [x] anon cannot select from `route_stops` (placeholder)
- [x] anon cannot select from `service_history` (placeholder)
- [x] anon cannot select from `inquiries` (placeholder)

## Data Integrity Checks

- [x] Customer insert/update constraints validated (placeholder)
- [x] Route status constraints validated (placeholder)
- [x] Invoice/payment constraints validated (placeholder)
- [x] New tables (`customer_notes`, `audit_logs`) validated (placeholder)
