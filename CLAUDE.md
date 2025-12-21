# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Commands

```bash
# Development
bun install                                          # Install dependencies
bun dev                                              # Start Astro dev server (localhost:4321)
npx convex dev                                       # Start Convex dev server (in separate terminal)

# Building
bun build                                            # Build production site to ./dist/
bun preview                                          # Preview production build locally

# Database operations
npx convex run actions/syncParks:syncParks --args '{"force": true}'    # Force sync parks from Google
npx convex run picks:getRecentPicks --args '{"limit": 10}'              # View recent park picks

# Other
bun run sync:dev                                     # Dev sync (shorthand)
bun run sync:prod                                    # Prod sync (shorthand)
```

## Architecture Overview

This is a full-stack park selection application combining:

- **Frontend**: Astro static site generator with inline scripts
- **Backend**: Convex (real-time database with serverless functions)
- **External API**: Google Places API (New) for park details and photos

### Data Flow

1. **Initial Page Load** → Astro calls `pickPark` action → Returns random park + photo → Renders HTML
2. **"Pick Another Park" Button** → Client-side fetch to Convex HTTP API → Updates display without reload
3. **"Open in Google Maps" Link** → Tracks visit via `trackVisit` action (fire-and-forget with keepalive)

### Database Schema

```
parks (synced from Google Places API):
  - placeId: string (indexed)
  - name: string
  - customName?: string (personal identifier/nickname)
  - address?: string
  - photoRefs: string[] (Google Places photo references)
  - lastSynced: number (timestamp)
  - visitCount?: number (incremented when user opens in Maps)

picks (selection history):
  - parkId: Id<"parks"> (indexed by chosenAt)
  - chosenAt: number (timestamp)

syncState (metadata):
  - lastSyncedAt: number (tracks when parks were last synced)
```

### Key Constraint

**No park repeats within the last 5 selections.** The `pickPark` action:
1. Queries all parks
2. Gets the last 5 picked park IDs
3. Filters out recently picked parks
4. Randomly selects from remaining eligible parks
5. Falls back to all parks if fewer than 5 exist in database

## Core Files and Responsibilities

### Frontend

- **`src/pages/index.astro`** - Main landing page
  - Calls `pickPark` on initial load (server-side)
  - Contains inline `<script>` for client-side park picking and visit tracking
  - Uses Fetch API with `keepalive` for reliable tracking before navigation

- **`src/lib/convexClient.ts`** - HTTP client for Convex actions/queries
  - `pickPark()` - Server-side action call
  - `getParkStats()` - Query for stats page
  - `getConvexUrl()` - Helper to get deployment URL
  - Uses `import.meta.env.CONVEX_URL` from `.env.local`

- **`src/styles/global.css`** - Single stylesheet with Tailwind CSS

### Backend (Convex)

- **`convex/schema.ts`** - Database schema definition (parks, picks, syncState)

- **`convex/parks.ts`** - Park queries and mutations
  - `list()` - Get all parks
  - `get(id)` - Get single park by ID
  - `count()` - Count total parks (used to check if data exists)
  - `listByVisitCount()` - Parks sorted by visits (for stats)
  - `incrementVisitCount()` - Increment visit counter (internal)
  - `upsertParks()` - Bulk insert/update from sync (internal)
  - `getSyncState()` / `updateSyncState()` - Sync metadata (internal)

- **`convex/picks.ts`** - Pick history tracking
  - `recordPick()` - Save a park selection (internal)
  - `getLastFivePickIds()` - Get recent selections (internal)
  - `getRecentPicks()` - Query for viewing history

- **`convex/actions/pickPark.ts`** - Main selection action
  - Validates parks exist (syncs if missing)
  - Implements no-repeat-in-5 logic
  - Generates Google Places photo URL
  - Returns PickedPark interface with park data and photoUrl

- **`convex/actions/syncParks.ts`** - Google Places sync action
  - Uses Places API (New) Text Search and Place Details endpoints
  - Syncs on 24-hour interval (or forced)
  - Iterates through `SRQ_PARKS` list, searches for each, fetches details
  - Rate limits with 200ms delays
  - Upserts parks into database

- **`convex/actions/trackVisit.ts`** - Records park visit (when user opens Maps)
  - Increments park's `visitCount`
  - Called via fire-and-forget fetch

- **`convex/lib/googleMaps.ts`** - Google Places API helpers
  - `searchPlace()` - Text Search API (finds place ID by query)
  - `fetchPlaceDetails()` - Place Details API (gets address, photos)
  - `getPhotoUrl()` - Generates media endpoint URL for photo display
  - `SRQ_PARKS` array - Hardcoded list of parks to sync

### Configuration

- **`astro.config.mjs`** - Astro config (enables Tailwind CSS via Vite plugin)
- **`tsconfig.json`** - TypeScript config for Astro
- **`convex/tsconfig.json`** - TypeScript config for Convex
- **`.env.local`** - Created by `npx convex dev`, contains `CONVEX_URL`
- **`.env.prod`** - Production Convex URL (set during build)

## Development Workflow

### Normal Development

Terminal 1:
```bash
npx convex dev
```

Terminal 2:
```bash
bun dev
```

Visit `http://localhost:4321`. The site hot-reloads for HTML/CSS/JS changes. Convex functions hot-reload when you save.

### Adding a New Park

1. Add to `SRQ_PARKS` array in `convex/lib/googleMaps.ts` with name and search query
2. Run `npx convex run actions/syncParks:syncParks --args '{"force": true}'`
3. Verify in Convex dashboard → Data → parks table

### Setting Custom Park Name

Use the Convex dashboard to edit a park's `customName` field. This displays above the official name on the UI.

### Debugging

- **View database**: Open [Convex Dashboard](https://dashboard.convex.dev/) → your project → Data
- **Check sync logs**: Run sync command with `--args '{"force": true}'` and watch console output
- **Verify picks constraint**: Query picks table, observe no `parkId` repeats in last 5 entries
- **Browser console**: Client-side errors logged when picking parks

## Important Implementation Notes

### Google Places API (New)

The codebase uses the **Places API (New)**, not the legacy Places API. Key differences:
- Photo references are full resource names: `places/{placeId}/photos/{photoRef}`
- Use `X-Goog-FieldMask` header to specify requested fields
- Media endpoint: `https://places.googleapis.com/v1/{photoName}/media?maxWidthPx={width}&key={apiKey}`

### Convex HTTP Calls

Both server-side (Astro) and client-side (browser) call Convex actions/queries via HTTP:
- **Server**: `/api/action` and `/api/query` endpoints (used in `convexClient.ts`)
- **Client**: Same endpoints from `index.astro` inline script
- No authentication needed for dev/preview (Convex dev mode is open)

### Fire-and-Forget Visit Tracking

The `trackVisit` call uses `fetch` with `keepalive: true` to ensure the request completes even if the user immediately navigates away. Errors are silently ignored.

### Photo URL Generation

The photo URL is generated on-demand in `pickPark` action (not stored). This ensures URLs remain valid and use the latest API key configuration.

## Deployment Notes

- `.env.prod` contains production Convex URL (different from dev)
- Build process: `bun build` outputs static site to `./dist/`
- Hosting: Static files only (no server runtime needed)
- Convex: Runs as serverless backend (configured in Convex dashboard)

## Stats Page

A `/stats` page exists (referenced in footer) that should display parks sorted by visit count. Check `src/pages/stats.astro` for implementation.
