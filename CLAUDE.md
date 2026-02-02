# Park Chooser

TanStack Start + Convex + Clerk application for park discovery and visit tracking.

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

## Context Files

- [Architecture](.claude/architecture.md) - Frontend/backend structure, data flow
- [Database Schema](.claude/database.md) - All tables, indexes, common queries
- [Convex Patterns](.claude/convex-patterns.md) - Function types, auth, entitlements
- [Google APIs](.claude/google-apis.md) - Places API, Distance Matrix, photo handling
- [Business Logic](.claude/business-logic.md) - Entitlement tiers, feature limits
- [Environment](.claude/environment.md) - Env vars setup
