"use node";

import { action } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

interface SeedResult {
  seeded: boolean;
  message?: string;
  count: number;
}

interface Park {
  _id: Id<"parks">;
  name: string;
  isRecommended?: boolean;
}

/**
 * Seed a new user with recommended parks.
 * Only runs if user has no parks in their list.
 */
export const seedUserWithRecommendedParks = action({
  args: {},
  handler: async (ctx): Promise<SeedResult> => {
    // Get current user
    const user = await ctx.runQuery(internal.users.getCurrentUserInternal);
    if (!user) {
      throw new Error("Authentication required");
    }

    // Check if user already has parks
    const userParkCount = await ctx.runQuery(api.userParks.getUserParkCount);
    if (userParkCount > 0) {
      return { seeded: false, message: "User already has parks", count: 0 };
    }

    // Check if user was already seeded (prevent re-seeding after removing all parks)
    if (user.seededAt) {
      return { seeded: false, message: "User was previously seeded", count: 0 };
    }

    // Get all parks from master catalog
    const allParks: Park[] = await ctx.runQuery(api.parks.list);
    if (allParks.length === 0) {
      // Try to sync parks first
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        await ctx.runAction(api.actions.syncParks.syncParks, { force: true });
        const syncedParks: Park[] = await ctx.runQuery(api.parks.list);
        if (syncedParks.length === 0) {
          return { seeded: false, message: "No parks available to seed", count: 0 };
        }
        // Seed with synced parks
        const parkIds: Id<"parks">[] = syncedParks.map((p: Park) => p._id);
        await ctx.runMutation(internal.userParks.seedUserParksInternal, {
          userId: user._id,
          parkIds,
        });
        await ctx.runMutation(internal.users.markUserSeeded, {
          userId: user._id,
        });
        return { seeded: true, count: parkIds.length };
      }
      return { seeded: false, message: "No parks available to seed", count: 0 };
    }

    // Filter to recommended parks if flag is set, otherwise use all
    const recommendedParks: Park[] = allParks.filter((p: Park) => p.isRecommended !== false);
    const parksToSeed: Park[] = recommendedParks.length > 0 ? recommendedParks : allParks;

    const parkIds: Id<"parks">[] = parksToSeed.map((p: Park) => p._id);
    await ctx.runMutation(internal.userParks.seedUserParksInternal, {
      userId: user._id,
      parkIds,
    });

    // Mark user as seeded
    await ctx.runMutation(internal.users.markUserSeeded, {
      userId: user._id,
    });

    return { seeded: true, count: parkIds.length };
  },
});
