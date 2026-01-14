import { mutation } from "../_generated/server";

/**
 * One-time migration: Seed existing users with all current parks.
 * Run with: npx convex run migrations/migrateExistingUsers:migrateExistingUsers
 */
export const migrateExistingUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const parks = await ctx.db.query("parks").collect();

    if (parks.length === 0) {
      return { migratedUsers: 0, totalParks: 0, message: "No parks to migrate" };
    }

    let migratedUsers = 0;

    for (const user of users) {
      // Check if user already has parks
      const existingUserPark = await ctx.db
        .query("userParks")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!existingUserPark) {
        // Add all parks to this user's list
        const now = Date.now();
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
      totalUsers: users.length,
    };
  },
});
