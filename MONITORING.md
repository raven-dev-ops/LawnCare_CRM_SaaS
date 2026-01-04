# Monitoring and Logging

This runbook describes where to find logs and how to respond to incidents.

## Log Locations

- Hosting provider (Vercel or equivalent): application logs, build logs, and serverless errors.
- Supabase: database logs, auth logs, and API usage.
- Stripe: webhook delivery logs and event replay.
- Google Cloud: Maps and OAuth API usage logs and quota.

## Suggested Alerts

- Error rate spike (5xx > 2% for 5 minutes).
- Stripe webhook failures (delivery failures or 5xx).
- Supabase auth errors (rate spikes or sustained failures).
- API quota nearing limits (Google Maps, Google Sheets).

## Escalation Steps

1. Confirm outage scope (UI access, API calls, third-party status pages).
2. Check hosting logs for recent errors or deploy changes.
3. Validate Supabase status and recent migrations.
4. Inspect Stripe webhook logs for failures.
5. Roll back the last deployment if needed.

## Contacts

Placeholders until client contacts are provided.

| Role | Name | Contact |
| --- | --- | --- |
| Primary On-Call | TBD (client) | TBD |
| Secondary | TBD (client) | TBD |
| Client Stakeholder | TBD (client) | TBD |
