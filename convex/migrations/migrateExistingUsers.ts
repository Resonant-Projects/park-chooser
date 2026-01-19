import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * One-time migration: Seed existing users with all current parks (paginated for memory safety).
 * Run with: npx convex run migrations/migrateExistingUsers:migrateExistingUsers
 * For large datasets, run multiple times with cursor until isDone is true.
 */
export const migrateExistingUsers = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, batchSize = 50 }) => {
    // Get parks (usually a small set, safe to collect)
    const parks = await ctx.db.query("parks").collect();

    if (parks.length === 0) {
      return { migratedUsers: 0, totalParks: 0, message: "No parks to migrate", isDone: true };
    }

    // Paginated user query
    const paginatedResult = await ctx.db.query("users").paginate({
      cursor: cursor ?? null,
      numItems: batchSize,
    });

    let migratedUsers = 0;
    const now = Date.now();

    for (const user of paginatedResult.page) {
      // Check if user already has parks
      const existingUserPark = await ctx.db
        .query("userParks")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!existingUserPark) {
        // Add all parks to this user's list
        for (const park of parks) {
          await ctx.db.insert("userParks", {
            userId: user._id,
            parkId: park._id,
            addedAt: now,
            visitCount: 0,
          });
        }
        migratedUsers++;
      }
    }

    return {
      migratedUsers,
      totalParks: parks.length,
      processedInBatch: paginatedResult.page.length,
      nextCursor: paginatedResult.continueCursor,
      isDone: paginatedResult.isDone,
    };
  },
});
