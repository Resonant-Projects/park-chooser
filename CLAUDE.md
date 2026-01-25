# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
bun install

# Start dev servers (frontend + Convex)
bun --bun run dev          # Frontend on port 3000
bunx convex dev            # Convex backend (separate terminal)

# Build & test
bun --bun run build        # Production build
bun --bun run test         # Run Vitest tests
bun --bun vitest run convex/lib/entitlements.test.ts  # Single test file

# Code quality
bun --bun run lint         # Biome linting
bun --bun run format       # Biome formatting
bun --bun run check        # Biome lint + format
```

## Architecture Overview

**TanStack Start + Convex + Clerk** application for park discovery and visit tracking.

### Frontend (`src/`)
- **Routing**: TanStack Router (file-based) in `src/routes/`
  - `__root.tsx` - Root layout with Clerk + Convex providers
  - `_authenticated.tsx` - Layout guard for auth-required routes
  - `_authenticated/*.tsx` - Protected routes (app, manage, discover, stats)
- **Integrations**: `src/integrations/{clerk,convex,tanstack-query}/` - Provider wrappers
- **Path alias**: `@/` → `src/`

### Backend (`convex/`)
- **Schema**: `schema.ts` - All table definitions with indexes
- **Functions**: Root-level files (`users.ts`, `parks.ts`, `picks.ts`, etc.)
- **Actions**: `actions/` - External API calls (Google Maps, referral processing)
- **HTTP**: `http.ts` - Webhook handlers (Clerk billing/user events)
- **Lib**: `lib/` - Shared utilities (entitlements, fraud detection, Google Maps API)

### Key Data Flow
1. **Auth**: Clerk handles auth → webhooks sync to Convex `users` table
2. **Billing**: Clerk Billing webhooks → `http.ts` → `userEntitlements` table
3. **Parks**: Google Places API (via `convex/lib/googleMaps.ts`) → `parks` table → user associations in `userParks`

## Code Conventions

### Biome Rules
- Indent: tabs
- Quotes: double
- Excluded from lint: `routeTree.gen.ts`, `styles.css`

### Convex Patterns
- System fields `_id` and `_creationTime` are auto-generated (don't add indexes)
- Use `v.id("tableName")` for foreign key references
- Internal functions via `internal` from `_generated/api`
- Actions for any external API calls or side effects

### Environment Variables
- Client-side: `VITE_` prefix, defined in `src/env.ts` via T3 Env
- Convex: Set via `bunx convex env set KEY=value`
- Required: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CONVEX_URL`
