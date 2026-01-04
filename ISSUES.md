# Outstanding Issues (SOW Milestones)

This list captures remaining work items after reviewing the repo against the SOW milestone list.

## Phase 0 - Kickoff and alignment

### Issue 001: Access provisioning checklist and owners
- [ ] Confirm admin access for GitHub, Supabase, hosting (Vercel or equivalent), Google Cloud (Maps + OAuth), Stripe, and notifications (SendGrid/Twilio if used).
- [ ] Define least-privilege roles and owner map for each system.
- [ ] Document access and credential storage/rotation steps.

### Issue 002: Success metrics and acceptance targets
- [ ] Define KPI targets (inquiry response time, inquiry-to-customer conversion, route efficiency, payment cycle time).
- [ ] Map KPIs to existing analytics data sources and identify gaps.
- [ ] Document metrics and acceptance thresholds.

### Issue 003: Backlog confirmation and release plan
- [ ] Confirm backlog priorities against the SOW and `ROADMAP.md`.
- [ ] Draft a release plan (staging -> production), including dates and sign-off points.
- [ ] Define release criteria and rollback expectations.

## Phase 1 - Foundation

### Issue 004: Baseline deployment validation
- [ ] Provision staging/production environments (Supabase + hosting).
- [ ] Configure production environment variables per `DEPLOYMENT.md`.
- [ ] Run the post-deploy checklist in `DEPLOYMENT.md` and record results.

### Issue 005: Data model and RLS validation
- [ ] Validate migrations in the target Supabase project.
- [ ] Execute the RLS regression checklist in `DEVELOPMENT.md`.
- [ ] Confirm data integrity constraints with sample records.

## Phase 2 - Core CRM

### Issue 006: Customer notes and communication log
- [ ] Add schema for customer notes/communication log (customer_id, channel, message, created_by, created_at).
- [ ] Implement UI for viewing and adding notes on customer detail.
- [ ] Add RLS policies and tests for notes access.

## Phase 4 - Billing and integrations

### Issue 007: Audit logs
- [ ] Add an audit log table for create/update/delete events.
- [ ] Capture events from customer, route, inquiry, and invoice actions.
- [ ] Add an admin UI view (or export) for audit logs.

## Phase 5 - Analytics and reporting

### Issue 008: Exportable reports
- [ ] Add CSV export for analytics KPIs and trend data.
- [ ] Support export of route statistics and service history summaries.
- [ ] Add tests for export endpoints and permission checks.

## Phase 6 - Hardening and launch

### Issue 009: Monitoring and logging guidance
- [ ] Document recommended monitoring/logging setup (host logs, Supabase logs, optional APM).
- [ ] Add alerting and escalation steps to the ops runbook.

### Issue 010: Security review and performance pass
- [ ] Run dependency and configuration security review.
- [ ] Review Stripe webhook and OAuth flows for hardening.
- [ ] Capture and document baseline performance metrics.

### Issue 011: UAT, go-live, and handoff
- [ ] Create a UAT checklist and defect triage workflow.
- [ ] Execute UAT on staging and track issues to closure.
- [ ] Prepare handoff materials and go-live checklist with sign-off.
