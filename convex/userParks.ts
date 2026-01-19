import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { TIER_LIMITS, type Tier, ENTITLEMENT_ERRORS, createLimitError } from "./lib/entitlements";

/**
 * List all parks in the current user's list with merged park details.
 */
export const listUserParks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    const userParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Fetch park details and merge with user-specific data
    const parksWithDetails = await Promise.all(
      userParks.map(async (up) => {
        const park = await ctx.db.get(up.parkId);
        if (!park) return null;
        return {
          _id: up._id,
          parkId: park._id,
          placeId: park.placeId,
          name: park.name,
          customName: up.customName ?? park.customName,
          address: park.address,
          photoRefs: park.photoRefs,
          visitCount: up.visitCount,
          lastVisitedAt: up.lastVisitedAt,
          notes: up.notes,
          addedAt: up.addedAt,
        };
      })
    );

    return parksWithDetails.filter(Boolean);
  },
});

/**
 * Add a park from the master catalog to the user's list.
 */
export const addParkToUserList = mutation({
  args: {
    parkId: v.id("parks"),
    customName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check entitlement limits
    const entitlement = await ctx.db
      .query("userEntitlements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const tier: Tier = entitlement?.tier ?? "free";
    const limit = TIER_LIMITS[tier].maxParks;

    const currentParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (currentParks.length >= limit) {
      throw createLimitError(
        ENTITLEMENT_ERRORS.PARK_LIMIT_EXCEEDED,
        `Park limit reached (${currentParks.length}/${limit}). Upgrade to Premium for unlimited parks.`,
        { tier, limit, current: currentParks.length }
      );
    }

    // Verify park exists in catalog
    const park = await ctx.db.get(args.parkId);
    if (!park) {
      throw new Error("Park not found in catalog");
    }

    // Check if user already has this park
    const existing = await ctx.db
      .query("userParks")
      .withIndex("by_user_park", (q) => q.eq("userId", user._id).eq("parkId", args.parkId))
      .unique();

    if (existing) {
      return { added: false, userParkId: existing._id, message: "Park already in list" };
    }

    const addedAt = Date.now();
    const userParkId = await ctx.db.insert("userParks", {
      userId: user._id,
      parkId: args.parkId,
      customName: args.customName,
      notes: args.notes,
      addedAt,
      visitCount: 0,
    });

    return {
      added: true,
      userParkId,
      message: "Park added to list",
      park: {
        _id: userParkId,
        parkId: park._id,
        placeId: park.placeId,
        name: park.name,
        customName: args.customName ?? park.customName,
        address: park.address,
        photoRefs: park.photoRefs,
        visitCount: 0,
        addedAt,
      },
    };
  },
});

/**
 * Remove a park from the user's list.
 */
export const removeParkFromUserList = mutation({
  args: {
    parkId: v.id("parks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const userPark = await ctx.db
      .query("userParks")
      .withIndex("by_user_park", (q) => q.eq("userId", user._id).eq("parkId", args.parkId))
      .unique();

    if (!userPark) {
      return { removed: false, message: "Park not in user's list" };
    }

    await ctx.db.delete(userPark._id);
    return { removed: true, message: "Park removed from list" };
  },
});

/**
 * Update user-specific park metadata (custom name, notes).
 */
export const updateUserPark = mutation({
  args: {
    userParkId: v.id("userParks"),
    customName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const userPark = await ctx.db.get(args.userParkId);
    if (!userPark || userPark.userId !== user._id) {
      throw new Error("User park not found or not owned by user");
    }

    const updates: Partial<{ customName: string; notes: string }> = {};
    if (args.customName !== undefined) updates.customName = args.customName;
    if (args.notes !== undefined) updates.notes = args.notes;

    // Skip db.patch if there are no updates to make
    if (Object.keys(updates).length === 0) {
      return { updated: false };
    }

    await ctx.db.patch(args.userParkId, updates);
    return { updated: true };
  },
});

/**
 * Get count of parks in user's list.
 */
export const getUserParkCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return 0;
    }

    const userParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return userParks.length;
  },
});

/**
 * Get user's parks sorted by visit count (for stats page).
 */
export const listUserParksByVisits = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    const userParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Fetch park details and merge
    const parksWithDetails = await Promise.all(
      userParks.map(async (up) => {
        const park = await ctx.db.get(up.parkId);
        if (!park) return null;
        return {
          _id: up._id,
          parkId: park._id,
          placeId: park.placeId,
          name: park.name,
          customName: up.customName ?? park.customName,
          address: park.address,
          visitCount: up.visitCount,
          lastVisitedAt: up.lastVisitedAt,
        };
      })
    );

    // Sort by visit count descending
    return parksWithDetails
      .filter(Boolean)
      .sort((a, b) => (b?.visitCount ?? 0) - (a?.visitCount ?? 0));
  },
});

// --- Internal functions (for use by actions) ---

/**
 * Get set of park IDs in user's list (for checking isInUserList).
 */
export const getUserParkIds = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return userParks.map((up) => up.parkId.toString());
  },
});

/**
 * Get last N picked park IDs for a specific user.
 */
export const getLastFivePickIdsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const picks = await ctx.db
      .query("picks")
      .withIndex("by_user_chosenAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(5);

    return picks.map((p) => p.parkId);
  },
});

/**
 * Get user parks with park details in one call (optimized for pickPark).
 */
export const getUserParksWithDetails = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const parksWithDetails = await Promise.all(
      userParks.map(async (up) => {
        const park = await ctx.db.get(up.parkId);
        if (!park) return null;
        return {
          _id: up._id,
          parkId: park._id,
          placeId: park.placeId,
          name: park.name,
          customName: up.customName ?? park.customName,
          address: park.address,
          photoRefs: park.photoRefs,
        };
      })
    );

    return parksWithDetails.filter(Boolean);
  },
});

/**
 * Increment visit count for a user's park.
 */
export const incrementUserParkVisit = internalMutation({
  args: {
    userId: v.id("users"),
    parkId: v.id("parks"),
  },
  handler: async (ctx, args) => {
    const userPark = await ctx.db
      .query("userParks")
      .withIndex("by_user_park", (q) => q.eq("userId", args.userId).eq("parkId", args.parkId))
      .unique();

    if (userPark) {
      await ctx.db.patch(userPark._id, {
        visitCount: userPark.visitCount + 1,
        lastVisitedAt: Date.now(),
      });
    }
  },
});

/**
 * Add multiple parks to a user's list (for seeding).
 * Respects tier limits - only seeds up to remaining capacity.
 */
export const seedUserParksInternal = internalMutation({
  args: {
    userId: v.id("users"),
    parkIds: v.array(v.id("parks")),
  },
  handler: async (ctx, args) => {
    // Get user's tier and limit
    const entitlement = await ctx.db
      .query("userEntitlements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const tier: Tier = entitlement?.tier ?? "free";
    const limit = TIER_LIMITS[tier].maxParks;

    // Get current park count
    const currentParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Calculate remaining capacity
    const remainingCapacity = Math.max(0, limit - currentParks.length);

    if (remainingCapacity === 0) {
      return { added: 0, reason: "at_limit" as const };
    }

    // Only seed up to remaining capacity
    const parksToSeed = args.parkIds.slice(0, remainingCapacity);

    const now = Date.now();
    let added = 0;

    for (const parkId of parksToSeed) {
      // Check if user already has this park
      const existing = await ctx.db
        .query("userParks")
        .withIndex("by_user_park", (q) => q.eq("userId", args.userId).eq("parkId", parkId))
        .unique();

      if (!existing) {
        await ctx.db.insert("userParks", {
          userId: args.userId,
          parkId,
          addedAt: now,
          visitCount: 0,
        });
        added++;
      }
    }

    return {
      added,
      reason: added < args.parkIds.length ? ("limited" as const) : ("success" as const),
    };
  },
});
