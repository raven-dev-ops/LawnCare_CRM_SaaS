# Contributing

Thanks for helping improve LawnCare CRM.

## Quick Start
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in values.
3. Run the app: `npm run dev`

For more details, see `DEVELOPMENT.md`.

## Code Style
- Run `npm run lint`, `npm run typecheck`, and `npm run test` before opening a PR.
- Prettier is optional but the repo includes `.prettierrc.json` for consistency.

## Database Changes
- Add schema changes in `supabase/migrations/`.
- Apply migrations with `npx supabase db push`.
- Include any required backfills or notes in the PR description.

## Pull Requests
- Keep changes focused and small when possible.
- Include screenshots for UI changes.
- Link related issues in the description.
