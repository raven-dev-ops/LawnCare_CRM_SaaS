# Metrics and KPI Targets

Define KPI formulas and targets here. Update targets during kickoff.
Targets below are placeholders until confirmed by the client.

## KPIs

| KPI | Definition | Data Source | Target |
| --- | --- | --- | --- |
| Inquiry response time | Time from inquiry creation to first staff response | `inquiries` + response tracking (TBD) | 24h (placeholder) |
| Inquiry-to-customer conversion | Converted inquiries / total inquiries | `inquiries` | 30% (placeholder) |
| Route efficiency | Total revenue / total distance | `route_statistics` | 120 revenue/mi (placeholder) |
| Jobs completed | Completed stops / total stops | `route_statistics` | 95% (placeholder) |
| Revenue per day | Total revenue / days in range | `route_statistics` or `service_history` | $1,000 (placeholder) |
| Payment cycle time | Time from invoice creation to payment | `invoices`, `payments` | 7 days (placeholder) |

## Data Notes

- Inquiry response time can use `inquiries.created_at` to `inquiries.contacted_at`.
- Payment cycle time can use `invoices.created_at` to `payments.paid_at`.
