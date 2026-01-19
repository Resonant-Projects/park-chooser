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
