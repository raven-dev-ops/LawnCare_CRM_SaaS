# Release Checklist

- Update `CHANGELOG.md` with user-facing changes.
- Review docs for accuracy (`README.md`, `DEPLOYMENT.md`, `API_REFERENCE.md`).
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Apply new migrations (if any) to the target Supabase project.
- Smoke test: login, customers, routes, inquiries.
- Confirm required environment variables are set in production.
- Confirm rollback plan in `RELEASE_PLAN.md`.
- Verify release criteria in `RELEASE_PLAN.md`.
- Record sign-off (product + technical).
- Tag the release in Git and publish.
