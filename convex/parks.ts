import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all parks from the database.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("parks").collect();
  },
});

/**
 * Get a single park by ID.
 */
export const get = query({
  args: { id: v.id("parks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get the current sync state (internal).
 */
export const getSyncState = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("syncState").first();
  },
});

/**
 * Update the sync state (internal).
 */
export const updateSyncState = internalMutation({
  args: { lastSyncedAt: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("syncState").first();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSyncedAt: args.lastSyncedAt });
    } else {
      await ctx.db.insert("syncState", { lastSyncedAt: args.lastSyncedAt });
    }
  },
});

/**
 * Upsert parks from sync (internal).
 */
export const upsertParks = internalMutation({
  args: {
    parks: v.array(
      v.object({
        placeId: v.string(),
        name: v.string(),
        address: v.optional(v.string()),
        photoRefs: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const park of args.parks) {
      // Check if park already exists
      const existing = await ctx.db
        .query("parks")
        .withIndex("by_placeId", (q) => q.eq("placeId", park.placeId))
        .first();

      if (existing) {
        // Update existing park
        await ctx.db.patch(existing._id, {
          name: park.name,
          address: park.address,
          photoRefs: park.photoRefs,
          lastSynced: now,
        });
      } else {
        // Insert new park
        await ctx.db.insert("parks", {
          placeId: park.placeId,
          name: park.name,
          address: park.address,
          photoRefs: park.photoRefs,
          lastSynced: now,
        });
      }
    }
  },
});

/**
 * Get park count (for checking if we have data).
 */
export const count = query({
  args: {},
  handler: async (ctx) => {
    const parks = await ctx.db.query("parks").collect();
    return parks.length;
  },
});

// Note: incrementVisitCount and listByVisitCount have been removed.
// Visit tracking is now per-user via userParks.ts:
// - incrementUserParkVisit (internal mutation)
// - listUserParksByVisits (public query)

/**
 * Upsert discovered parks from nearby search (internal).
 * Includes lat/lng coordinates and primaryType for location-based features.
 */
export const upsertDiscoveredParks = internalMutation({
  args: {
    parks: v.array(
      v.object({
        placeId: v.string(),
        name: v.string(),
        address: v.optional(v.string()),
        photoRefs: v.array(v.string()),
        lat: v.number(),
        lng: v.number(),
        primaryType: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const upsertedIds: Array<{ placeId: string; _id: string }> = [];

    for (const park of args.parks) {
      const existing = await ctx.db
        .query("parks")
        .withIndex("by_placeId", (q) => q.eq("placeId", park.placeId))
        .first();

      if (existing) {
        // Update existing park with latest data
        await ctx.db.patch(existing._id, {
          name: park.name,
          address: park.address,
          photoRefs: park.photoRefs,
          lat: park.lat,
          lng: park.lng,
          primaryType: park.primaryType,
          lastSynced: now,
        });
        upsertedIds.push({ placeId: park.placeId, _id: existing._id });
      } else {
        // Insert new discovered park
        const newId = await ctx.db.insert("parks", {
          placeId: park.placeId,
          name: park.name,
          address: park.address,
          photoRefs: park.photoRefs,
          lat: park.lat,
          lng: park.lng,
          primaryType: park.primaryType,
          lastSynced: now,
          discoveredAt: now,
        });
        upsertedIds.push({ placeId: park.placeId, _id: newId });
      }
    }

    return upsertedIds;
  },
});

/**
 * Get parks available for user to add (not already in their list).
 */
export const getAvailableParks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Unauthenticated: return all parks
      return await ctx.db.query("parks").collect();
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return await ctx.db.query("parks").collect();
    }

    // Get user's current park IDs
    const userParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const userParkIds = new Set(userParks.map((up) => up.parkId.toString()));

    // Get all parks, filter out user's parks
    const allParks = await ctx.db.query("parks").collect();

    return allParks.filter((park) => !userParkIds.has(park._id.toString()));
  },
});
