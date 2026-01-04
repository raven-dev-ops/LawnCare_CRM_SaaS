# Release Plan

This plan documents the staging -> production release flow and sign-off points.

## Environments

- Staging: https://staging.example.com (placeholder)
- Production: https://app.example.com (placeholder)

## Timeline

1. Code freeze: TBD
2. Staging deploy: TBD
3. Staging UAT window: TBD
4. Go/No-Go review: TBD
5. Production deploy: TBD

## Sign-Off

- Product owner sign-off: TBD
- Technical sign-off: TBD
- Security sign-off (if required): TBD
Note: placeholders until client approvals are captured.

## Rollback Plan

- Roll back to the previous successful deployment in hosting provider.
- Revert recent migrations if required (prefer forward-fix; avoid destructive rollback).
- Notify stakeholders and document impact.

## Release Criteria

- No Critical/High severity issues open.
- UAT checklist completed and signed off.
- Post-deploy smoke tests completed.
