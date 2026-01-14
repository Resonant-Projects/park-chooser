import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

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

/**
 * Backfill action: Create default free entitlements for all existing users
 * who don't have one yet.
 *
 * Run this once after deploying the entitlements feature:
 * npx convex run actions/backfillEntitlements:backfillEntitlements
 */
export const backfillEntitlements = action({
  args: {},
  handler: async (ctx) => {
    // Get users without entitlements
    const usersWithoutEntitlements = await ctx.runQuery(
      internal.actions.backfillEntitlements.getUsersWithoutEntitlements
    );

    console.log(
      `Found ${usersWithoutEntitlements.length} users without entitlements`
    );

    if (usersWithoutEntitlements.length === 0) {
      return {
        success: true,
        message: "No users need entitlement backfill",
        created: 0,
      };
    }

    // Create entitlements for each user
    let created = 0;
    const errors: string[] = [];

    for (const user of usersWithoutEntitlements) {
      try {
        const result = await ctx.runMutation(
          internal.entitlements.createDefaultEntitlement,
          { userId: user._id }
        );

        if (result.created) {
          created++;
          console.log(`Created entitlement for user: ${user._id}`);
        } else {
          console.log(`Entitlement already exists for user: ${user._id}`);
        }
      } catch (error) {
        const message = `Failed to create entitlement for user ${user._id}: ${error}`;
        console.error(message);
        errors.push(message);
      }
    }

    return {
      success: errors.length === 0,
      message: `Created ${created} entitlements out of ${usersWithoutEntitlements.length} users`,
      created,
      total: usersWithoutEntitlements.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

/**
 * Check status: How many users are missing entitlements?
 *
 * Run to check before/after backfill:
 * npx convex run actions/backfillEntitlements:checkEntitlementStatus
 */
export const checkEntitlementStatus = action({
  args: {},
  handler: async (ctx) => {
    const usersWithoutEntitlements = await ctx.runQuery(
      internal.actions.backfillEntitlements.getUsersWithoutEntitlements
    );

    return {
      usersNeedingBackfill: usersWithoutEntitlements.length,
      users: usersWithoutEntitlements.map((u) => ({
        id: u._id,
        email: u.email,
        name: u.name,
      })),
    };
  },
});
