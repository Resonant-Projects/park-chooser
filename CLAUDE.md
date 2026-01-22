# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Park Chooser - a multi-tenant park selection app. Users curate a list of parks, then get random picks with no repeats in the last 5 selections. Features Clerk auth, free/premium tiers, and a referral system.

## Commands

```bash
# Development (two terminals required)
bun dev                    # Astro dev server (localhost:4321)
npx convex dev             # Convex backend (required for any functionality)

# Build & Deploy
bun build                  # Production build to ./dist/
npx convex deploy          # Deploy Convex functions to production

# Lint & Format
bun run check              # Run both ESLint and Prettier checks
bun run lint:fix           # Auto-fix lint issues
bun run format             # Auto-format with Prettier

# Database Operations
npx convex run actions/syncParks:syncParks --args '{"force": true}'   # Sync SRQ_PARKS to database
npx convex run picks:getRecentPicks --args '{"limit": 10}'            # View recent picks
```

## Critical Constraints

- **No-repeat rule**: Parks can't repeat within last 5 picks per user (`convex/actions/pickPark.ts`)
- **Tier limits**: Free = 5 parks, 1 pick/day. Premium = unlimited (`convex/lib/entitlements.ts`)
- **Tailwind v4**: Uses Vite plugin, NOT PostCSS. Configure via `@theme` in CSS files, not `tailwind.config.js`
- **Photo refs expire**: Google Places photo references are short-lived. Always fetch fresh via `loadFreshPhotos()`

## Webhook Endpoints

| Endpoint                  | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `/webhooks/clerk-billing` | Clerk subscription events - syncs user entitlements |

Never modify `users` or `userEntitlements` tables directly - let webhooks handle user sync.

## Architecture Docs

Detailed documentation in `.claude/`:

- [Architecture & Data Flow](.claude/architecture.md) - Stack overview, business rules, auth flow
- [Database Schema](.claude/database.md) - Tables, relationships, indexes
- [Convex Patterns](.claude/convex-patterns.md) - Query/mutation/action conventions
- [Google APIs](.claude/google-apis.md) - Places API, Distance Matrix integration
