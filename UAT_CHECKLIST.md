# UAT Checklist

Use this checklist during staging validation before go-live.

Staging URL: https://staging.example.com (placeholder)

## Authentication and Access

- [ ] Admin can sign in and access all dashboard modules.
- [ ] Staff can sign in and access assigned modules only.
- [ ] Public users can submit inquiries but cannot read CRM data.

## Core CRM

- [ ] Create, edit, and archive a customer.
- [ ] Import/export customers (CSV and Google Sheets if configured).
- [ ] Service history entries can be created and viewed.

## Scheduling and Routing

- [ ] Create a new route and optimize stops.
- [ ] Update route stop status and add service notes.
- [ ] Schedule board displays upcoming routes and recurring plans.

## Inquiries and Lead Intake

- [ ] Submit inquiry via `/inquiry` and verify rate limiting.
- [ ] Update inquiry status and convert to customer.

## Billing and Integrations

- [ ] Create invoice and line items.
- [ ] Stripe checkout completes and webhook records payment.
- [ ] Google Sheets import/export works if configured.

## Analytics and Reporting

- [ ] Dashboard KPIs populate and charts render.
- [ ] Export reports if enabled.

## Security and Performance

- [ ] RLS regression checks pass (no anon reads).
- [ ] App responds within acceptable thresholds on key pages.

## Sign-Off

- [x] UAT completed by product owner (placeholder).
- [x] Issues triaged and resolved (no Critical/High open) (placeholder).
