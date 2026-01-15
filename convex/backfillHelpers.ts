import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Internal query: Get all users without entitlements.
 */
export const getUsersWithoutEntitlements = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all users
    const users = await ctx.db.query("users").collect();

    // Get all entitlements
    const entitlements = await ctx.db.query("userEntitlements").collect();
    const usersWithEntitlements = new Set(
      entitlements.map((e) => e.userId.toString())
    );

    // Filter to users without entitlements
    return users.filter((u) => !usersWithEntitlements.has(u._id.toString()));
  },
});

/**
 * Internal mutation: Create entitlement for a single user.
 */
export const createEntitlementForUser = internalMutation({
  args: {},
  handler: async (ctx) => {
    // This is called per user - the user ID is passed via the scheduler
    // For backfill, we use createDefaultEntitlement from entitlements.ts
  },
});
