import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

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
    const usersWithEntitlements = new Set(entitlements.map((e) => e.userId.toString()));

    // Filter to users without entitlements
    return users.filter((u) => !usersWithEntitlements.has(u._id.toString()));
  },
});

/**
 * Internal mutation: Create entitlement for a single user.
 */
export const createEntitlementForUser = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ created: boolean }> => {
    // Validate user ID is provided
    if (!args.userId) {
      throw new Error("userId is required");
    }

    // Create default entitlement using the existing function
    const result: { created: boolean } = await ctx.runMutation(
      internal.entitlements.createDefaultEntitlement,
      { userId: args.userId }
    );

    return result;
  },
});
