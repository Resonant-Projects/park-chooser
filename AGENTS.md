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

- [Architecture](.Codex/architecture.md) - Frontend/backend structure, data flow
- [Database Schema](.Codex/database.md) - All tables, indexes, common queries
- [Convex Patterns](.Codex/convex-patterns.md) - Function types, auth, entitlements
- [Google APIs](.Codex/google-apis.md) - Places API, Distance Matrix, photo handling
- [Business Logic](.Codex/business-logic.md) - Entitlement tiers, feature limits
- [Environment](.Codex/environment.md) - Env vars setup
