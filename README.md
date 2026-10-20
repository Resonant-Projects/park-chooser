# Pick A Park

**Live:** [pickapark.app](https://pickapark.app)

Random park picker for families - end the endless "where should we go?" debate.

## The Problem

Every weekend, the same conversation: "Which park should we go to?" Decision fatigue sets in, kids get restless, and half the day is gone before you've left the house. Pick A Park solves this by randomly choosing your next adventure with one tap.

## Features

- **Random Park Picker** - One tap to choose your next adventure
- **Discover Nearby Parks** - Find new parks using geolocation
- **Manage Your Collection** - Curate your favorite parks
- **Travel Time** - See driving distance before you go
- **Visit Tracking** - Track where you've been

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | TanStack Start (React 19, TanStack Router) |
| Backend | Convex (serverless, real-time) |
| Auth | Clerk |
| APIs | Google Places API, Google Distance Matrix |
| Styling | Tailwind CSS 4 |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 22.13+ (22.x), or Node.js 24+
- [bun](https://bun.sh)
- [Clerk](https://clerk.com) account
- [Convex](https://convex.dev) account
- [Google Cloud](https://console.cloud.google.com) project with Places API and Distance Matrix API enabled

### Installation

```bash
git clone https://github.com/Resonant-Projects/park-chooser.git
cd park-chooser
bun install
```

### Environment Setup

Create `.env.local` with:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_CONVEX_URL=https://...convex.cloud
```

Both values are in the Vercel project's Development environment. To fetch them, run `vercel link` once, then `vercel env pull --environment=development` and copy only the two `VITE_` lines into `.env.local` (the pulled file also contains server secrets that do not belong in the frontend env).

`bun run build` and `bun run dev` fail with a clear error if `VITE_CLERK_PUBLISHABLE_KEY` or `VITE_CONVEX_URL` is missing or malformed (see `build/require-build-env.ts`); the app never runs with sign-in disabled. On Vercel, `convex deploy --cmd 'vite build'` supplies `VITE_CONVEX_URL`, and the Clerk key must be set for both Preview and Production. Tests, typecheck and lint do not need these variables.

Set Convex server-side variables:

```bash
bunx convex env set CLERK_WEBHOOK_SECRET=whsec_...
bunx convex env set GOOGLE_MAPS_API_KEY=AIza...
```

See [environment docs](.claude/environment.md) for details.

### Run Development Servers

Terminal 1 - Frontend:
```bash
bun --bun run dev
```

Terminal 2 - Convex backend:
```bash
bunx convex dev
```

App runs at [localhost:3000](http://localhost:3000)

## Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun --bun run dev` | Start frontend (port 3000) |
| `bunx convex dev` | Start Convex backend |
| `bun --bun run build` | Production build |
| `bun --bun run test` | Run tests |
| `bun --bun run lint` | Lint with Biome |
| `bun --bun run format` | Format with Biome |

## File size limit (pre-commit)

A Husky pre-commit hook (`scripts/check-file-tokens.mjs`) blocks any staged file over **5,000 estimated tokens** (bytes / 4, i.e. 20,000 bytes). Lockfiles, generated code (`convex/_generated/`, `routeTree.gen.ts`), and binary assets are ignored. Split large files by responsibility instead of bypassing; `git commit --no-verify` is for emergencies only. Hooks install automatically with `bun install` (via the `prepare` script); run `bun run check:file-tokens` to list every tracked file over the limit.

## Project Structure

```
src/
  routes/           # TanStack Router file-based routes
  components/       # React components
  lib/              # Utilities and helpers
  env.ts            # Type-safe environment variables (T3 Env)

convex/
  schema.ts         # Database schema
  *.ts              # Backend functions (queries, mutations, actions)
```

## Documentation

Detailed documentation lives in `.claude/`:

- [Architecture](.claude/architecture.md) - Frontend/backend structure, data flow
- [Database Schema](.claude/database.md) - Tables, indexes, common queries
- [Convex Patterns](.claude/convex-patterns.md) - Function types, auth, entitlements
- [Google APIs](.claude/google-apis.md) - Places API, Distance Matrix, photo handling
- [Business Logic](.claude/business-logic.md) - Entitlement tiers, feature limits
- [Environment](.claude/environment.md) - Environment variable setup
