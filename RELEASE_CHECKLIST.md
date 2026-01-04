# Release Checklist

- Update `CHANGELOG.md` with user-facing changes.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Apply new migrations (if any) to the target Supabase project.
- Smoke test: login, customers, routes, inquiries.
- Confirm required environment variables are set in production.
- Tag the release in Git and publish.
