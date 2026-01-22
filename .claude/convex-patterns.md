# Convex Patterns

Conventions and patterns used in this codebase's Convex functions.

## Function Types

### Queries

Read-only, cached, reactive. Use for fetching data.

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { id: v.id("parks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

### Mutations

Write operations. Transactional, consistent.

```typescript
import { mutation } from "./_generated/server";

export const myMutation = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("parks", { name: args.name, ... });
  },
});
```

### Actions

For external API calls (Google APIs, webhooks). Use `"use node"` directive.

```typescript
"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";

export const myAction = action({
  args: {},
  handler: async (ctx) => {
    // Can call external APIs
    const response = await fetch("https://api.example.com");

    // Must use runQuery/runMutation for DB access
    const data = await ctx.runQuery(internal.parks.list);
    await ctx.runMutation(internal.parks.update, { ... });

    return data;
  },
});
```

### Internal Functions

Not exposed to clients. Use `internal*` variants.

```typescript
import { internalQuery, internalMutation } from "./_generated/server";

// Only callable from other Convex functions
export const getById = internalQuery({
  args: { id: v.id("parks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

## Authentication Pattern

### Getting Current User

```typescript
export const myQuery = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) return null;

    // Now use user._id for queries
  },
});
```

### Internal User Helper

Use `internal.users.getCurrentUserInternal` in actions:

```typescript
export const pickPark = action({
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrentUserInternal);
    if (!user) throw new Error("Authentication required");
    // ...
  },
});
```

## Entitlement Checks

### Check Before Action

```typescript
// In an action
const pickCheck = await ctx.runQuery(internal.entitlements.checkCanPickToday, {
  userId: user._id,
});

if (!pickCheck.canPick) {
  throw createLimitError(
    ENTITLEMENT_ERRORS.DAILY_PICK_LIMIT_EXCEEDED,
    `Daily limit reached (${pickCheck.currentCount}/${pickCheck.limit})`,
    { tier: pickCheck.tier, limit: pickCheck.limit, current: pickCheck.currentCount }
  );
}
```

### Structured Errors

Use `createLimitError` from `convex/lib/entitlements.ts` for UI-parseable errors:

```typescript
throw createLimitError(
  ENTITLEMENT_ERRORS.PARK_LIMIT_EXCEEDED,
  "Park limit reached. Upgrade for more.",
  { tier: "free", limit: 5, current: 5 }
);
```

Client parses: `JSON.parse(error.message)`

## HTTP Endpoints

### Webhook Handler Pattern

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/webhooks/example",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Validate signature first
    const result = await validateRequest(request);
    if (!result.success) {
      return new Response(result.error, { status: 400 });
    }

    // Process event
    await ctx.runMutation(internal.something.update, { ... });

    return new Response(null, { status: 200 });
  }),
});

export default http;
```

## File Organization

```
convex/
├── schema.ts              # All table definitions
├── _generated/            # Auto-generated (don't edit)
├── http.ts                # HTTP routes (webhooks)
├── crons.ts               # Scheduled jobs
│
├── parks.ts               # Park queries/mutations
├── users.ts               # User queries/mutations
├── picks.ts               # Pick history
├── userParks.ts           # User park list management
├── entitlements.ts        # Tier checks
├── referralCodes.ts       # Referral system
├── feedback.ts            # User feedback
├── rateLimits.ts          # Rate limiting
│
├── actions/               # External API calls
│   ├── pickPark.ts        # Main park selection
│   ├── syncParks.ts       # Google Places sync
│   ├── getTravelTime.ts   # Distance Matrix
│   └── ...
│
├── lib/                   # Shared utilities
│   ├── googleMaps.ts      # Google API helpers
│   ├── entitlements.ts    # Tier limits, error helpers
│   ├── fraudDetection.ts  # Referral abuse checks
│   └── userHelpers.ts     # User utilities
│
└── migrations/            # Data migrations
    └── ...
```

## Common Patterns

### Upsert Pattern

```typescript
const existing = await ctx.db
  .query("table")
  .withIndex("by_key", (q) => q.eq("key", args.key))
  .unique();

if (existing) {
  await ctx.db.patch(existing._id, { ...updates });
} else {
  await ctx.db.insert("table", { ...newRecord });
}
```

### Collecting with Details

```typescript
// Get userParks with full park details
const userParks = await ctx.db
  .query("userParks")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .collect();

return Promise.all(
  userParks.map(async (up) => {
    const park = await ctx.db.get(up.parkId);
    return park ? { ...up, ...park } : null;
  })
).then((results) => results.filter(Boolean));
```

### Rate Limiting

```typescript
const identifier = ipHash || `user:${userId}`;
const existing = await ctx.db
  .query("rateLimits")
  .withIndex("by_identifier_action", (q) => q.eq("identifier", identifier).eq("action", "contact"))
  .unique();

const windowMs = 60 * 60 * 1000; // 1 hour
const now = Date.now();

if (existing && now - existing.windowStart < windowMs) {
  if (existing.count >= MAX_REQUESTS) {
    throw new Error("Rate limit exceeded");
  }
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
} else {
  await ctx.db.insert("rateLimits", {
    identifier,
    action: "contact",
    count: 1,
    windowStart: now,
  });
}
```
