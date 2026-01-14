import { mutation } from "../_generated/server";

/**
 * One-time migration: Mark all existing parks as recommended.
 * Run with: npx convex run migrations/markRecommendedParks:markRecommendedParks
 */
export const markRecommendedParks = mutation({
  args: {},
  handler: async (ctx) => {
    const parks = await ctx.db.query("parks").collect();

    for (const park of parks) {
      await ctx.db.patch(park._id, { isRecommended: true });
    }

    return { updated: parks.length };
  },
});
