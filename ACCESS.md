# Access Provisioning and Ownership

Use this checklist during kickoff and before go-live. Placeholder entries are marked until
credentials are provided.

## Systems and Owners

| System | Owner | Role | Notes |
| --- | --- | --- | --- |
| GitHub | TBD (client) | Admin | Repo access and branch protections |
| Supabase | TBD (client) | Owner | Project access and service role key storage |
| Hosting (Vercel or equivalent) | TBD (client) | Admin | Env vars and deployment controls |
| Google Cloud (Maps + OAuth) | TBD (client) | Admin | API key restrictions and billing |
| Stripe | TBD (client) | Admin | Webhook configuration and API keys |
| SendGrid (optional) | TBD (client) | Admin | Email notifications |
| Twilio (optional) | TBD (client) | Admin | SMS notifications |

## Access Validation Log (Placeholder)

- [x] GitHub access validated (placeholder)
- [x] Supabase access validated (placeholder)
- [x] Hosting access validated (placeholder)
- [x] Google Cloud access validated (placeholder)
- [x] Stripe access validated (placeholder)
- [x] SendGrid access validated (placeholder)
- [x] Twilio access validated (placeholder)

## Credential Rotation

- [ ] Stripe keys rotated
- [ ] Supabase service role key rotated
- [ ] Google Cloud API keys rotated
- [ ] OAuth client secret rotated
