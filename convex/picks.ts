import { query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the last N picks, ordered by most recent first.
 */
export const getRecentPicks = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const picks = await ctx.db.query("picks").withIndex("by_chosenAt").order("desc").take(limit);

    // Fetch the associated parks
    const picksWithParks = await Promise.all(
      picks.map(async (pick) => {
        const park = await ctx.db.get(pick.parkId);
        return { ...pick, park };
      })
    );

    return picksWithParks;
  },
});

/**
 * Get the last 5 picked park IDs (internal).
 */
export const getLastFivePickIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const picks = await ctx.db.query("picks").withIndex("by_chosenAt").order("desc").take(5);

    return picks.map((p) => p.parkId);
  },
});

/**
 * Record a new pick (internal).
 */
export const recordPick = internalMutation({
  args: {
    parkId: v.id("parks"),
    userId: v.id("users"),
    userParkId: v.optional(v.id("userParks")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("picks", {
      parkId: args.parkId,
      userId: args.userId,
      userParkId: args.userParkId,
      chosenAt: Date.now(),
    });
  },
});

/**
 * Get all picks (for debugging/admin).
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const picks = await ctx.db.query("picks").withIndex("by_chosenAt").order("desc").collect();

    const picksWithParks = await Promise.all(
      picks.map(async (pick) => {
        const park = await ctx.db.get(pick.parkId);
        return { ...pick, park };
      })
    );

    return picksWithParks;
  },
});

/**
 * Get today's pick for a user (internal).
 * Returns the most recent pick made today (UTC) or null if none exists.
 */
export const getTodaysPickForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get start of today (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayTimestamp = todayStart.getTime();

    // Query the most recent pick for this user today
    const todaysPick = await ctx.db
      .query("picks")
      .withIndex("by_user_chosenAt", (q) =>
        q.eq("userId", args.userId).gte("chosenAt", todayTimestamp)
      )
      .order("desc")
      .first();

    if (!todaysPick) return null;

    // Get park details
    const park = await ctx.db.get(todaysPick.parkId);
    if (!park) return null;

    // Get user's custom name for this park
    const userPark = todaysPick.userParkId ? await ctx.db.get(todaysPick.userParkId) : null;

    return {
      parkId: park._id,
      placeId: park.placeId,
      name: park.name,
      customName: userPark?.customName ?? park.customName,
      address: park.address,
      photoRefs: park.photoRefs,
      chosenAt: todaysPick.chosenAt,
    };
  },
});
