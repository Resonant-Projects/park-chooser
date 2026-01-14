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

- **Frontend**: Astro static site generator with Starwind UI components
- **Backend**: Convex (real-time database with serverless functions)
- **Authentication**: Clerk
- **External APIs**: Google Places API (New) for park details/photos, Distance Matrix API for travel time
- **Analytics**: Vercel Analytics for page tracking

### Data Flow

1. **Initial Page Load** → Astro renders placeholder UI with "Pick a Park" button
2. **"Pick a Park" Button** → Client-side fetch to Convex `pickPark` action → Returns random park + photo → Updates display → Requests geolocation → Fetches travel time
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
  - Renders placeholder UI initially (no server-side data fetch)
  - Contains inline `<script>` for client-side park picking, visit tracking, and travel time
  - Uses browser geolocation API for travel time calculation
  - Uses Fetch API with `keepalive` for reliable tracking before navigation

- **`src/pages/stats.astro`** - Stats page showing park visit counts
  - Server-side fetches all parks sorted by visit count
  - Uses Starwind Table components for display

- **`src/components/starwind/`** - Starwind UI component library
  - `badge/` - Badge component for labels
  - `button/` - Primary/secondary button variants
  - `card/` - Card with Header, Title, Description, Content, Footer
  - `separator/` - Horizontal/vertical dividers
  - `spinner/` - Loading spinner
  - `table/` - Table, TableHeader, TableBody, TableRow, TableCell, etc.

- **`src/lib/convexClient.ts`** - HTTP client for Convex actions/queries
  - `pickPark()` - Server-side action call (currently unused, kept for reference)
  - `getParkStats()` - Query for stats page
  - `getConvexUrl()` - Helper to get deployment URL for client-side calls
  - Uses `import.meta.env.CONVEX_URL` from `.env.local`

- **`src/styles/global.css`** - Main stylesheet with custom properties and animations
- **`src/styles/starwind.css`** - Starwind component base styles

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

- **`convex/actions/getTravelTime.ts`** - Calculate driving time to park
  - Takes origin coordinates (from browser geolocation) and destination place ID
  - Returns duration and distance text (e.g., "15 mins", "5.2 mi")
  - Called client-side after park is picked

- **`convex/lib/googleMaps.ts`** - Google API helpers
  - `searchPlace()` - Text Search API (finds place ID by query)
  - `fetchPlaceDetails()` - Place Details API (gets address, photos)
  - `getPhotoUrl()` - Generates media endpoint URL for photo display
  - `getTravelTime()` - Distance Matrix API (calculates driving time/distance)
  - `SRQ_PARKS` array - Hardcoded list of parks to sync

### Configuration

- **`astro.config.mjs`** - Astro config (Tailwind v4 via `@tailwindcss/vite` plugin)
- **`tsconfig.json`** - TypeScript config for Astro
- **`convex/tsconfig.json`** - TypeScript config for Convex
- **`.env.local`** - Created by `npx convex dev`, contains `CONVEX_URL`
- **`.env.prod`** - Production Convex URL (set during build)

**Note:** This project uses **Tailwind CSS v4** with the Vite plugin (`@tailwindcss/vite`), not the PostCSS plugin. Configuration is done via CSS `@theme` directives in stylesheets rather than `tailwind.config.js`.

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

### Google APIs Required

**Places API (New)** - for park details and photos:
- Photo references are full resource names: `places/{placeId}/photos/{photoRef}`
- Use `X-Goog-FieldMask` header to specify requested fields
- Media endpoint: `https://places.googleapis.com/v1/{photoName}/media?maxWidthPx={width}&key={apiKey}`

**Distance Matrix API** - for travel time calculation:
- Calculates driving duration/distance from user location to park
- Uses imperial units (miles, minutes)
- Requires user to grant browser geolocation permission

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

The `/stats` page displays all parks in a table sorted by visit count (highest first). Features:
- Uses Starwind Table components for consistent styling
- Shows total visit count in header badge
- Parks with visits are highlighted with gold background
- Links back to main page
