# Contributing

Thanks for helping improve LawnCare CRM.

## Quick Start
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in values.
3. Run the app: `npm run dev`

For more details, see `DEVELOPMENT.md`.

## Code Style and Tests
- Run `npm run lint` and `npm run typecheck` before opening a PR.
- Run `npm run test` (Vitest) for API/UI smoke tests.
- For UI or workflow changes, run `npm run test:e2e` (Playwright). Use `npm run test:e2e:screenshots` if you need to refresh UI captures in `tests/e2e/screenshots`.
- Prettier is optional but the repo includes `.prettierrc.json` for consistency.

## Database Changes
- Add schema changes in `supabase/migrations/`.
- Apply migrations with `npx supabase db push`.
- Include any required backfills or notes in the PR description.

## Pull Requests
- Keep changes focused and small when possible.
- Include screenshots or updated Playwright captures for UI changes.
- Update docs and `CHANGELOG.md` for user-facing changes (and `FEATURES.md` or `ARCHITECTURE.md` when behavior changes).
- Link related issues in the description.
