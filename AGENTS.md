# Park Chooser

TanStack Start + Convex + Clerk application for park discovery and visit tracking.

## Scope discipline

- Before adding complexity for a speculative or vanishingly unlikely race or security edge case, explain the concrete failure mode, likelihood, and complexity cost to the user and get their buy-in. Do not silently expand scope for theoretical robustness.

## Commands

```bash
bun install                  # Install dependencies
bun --bun run dev            # Frontend (port 3000)
bunx convex dev              # Backend (separate terminal)
bun --bun run build          # Production build
bun --bun run test           # Run tests
```

## Path Alias

`@/` → `src/`

## File Size Limit

A pre-commit hook blocks files over 5,000 estimated tokens (20,000 bytes). Keep new files small and split by responsibility; generated files and lockfiles are exempt (see `scripts/check-file-tokens.mjs`).

## Context Files

- [Architecture](.Codex/architecture.md) - Frontend/backend structure, data flow
- [Database Schema](.Codex/database.md) - All tables, indexes, common queries
- [Convex Patterns](.Codex/convex-patterns.md) - Function types, auth, entitlements
- [Google APIs](.Codex/google-apis.md) - Places API, Distance Matrix, photo handling
- [Business Logic](.Codex/business-logic.md) - Entitlement tiers, feature limits
- [Environment](.Codex/environment.md) - Env vars setup
