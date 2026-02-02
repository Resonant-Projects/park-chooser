# Architecture

## Frontend (`src/`)

**Routing**: TanStack Router (file-based) in `src/routes/`
- `__root.tsx` - Root layout with Clerk + Convex providers
- `_authenticated.tsx` - Layout guard for auth-required routes
- `_authenticated/*.tsx` - Protected routes (app, manage, discover, stats)

**Integrations**: `src/integrations/{clerk,convex,tanstack-query}/` - Provider wrappers (SSR-safe, lazy initialization)

## Backend (`convex/`)

- **Schema**: `schema.ts` - All table definitions with indexes
- **Functions**: Root-level files (`users.ts`, `parks.ts`, `picks.ts`, etc.)
- **Actions**: `actions/` - External API calls (Google Maps, referral processing)
- **HTTP**: `http.ts` - Webhook handlers (Clerk billing/user events)
- **Lib**: `lib/` - Shared utilities (entitlements, fraud detection, Google Maps API)

## Data Flow

1. **Auth**: Clerk handles auth → webhooks sync to Convex `users` table
2. **Billing**: Clerk Billing webhooks → `http.ts` → `userEntitlements` table
3. **Parks**: Google Places API (via `convex/lib/googleMaps.ts`) → `parks` table → user associations in `userParks`
