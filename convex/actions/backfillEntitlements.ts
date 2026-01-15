"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";

interface BackfillResult {
  success: boolean;
  message: string;
  created: number;
  total?: number;
  errors?: string[];
}

interface EntitlementStatusResult {
  usersNeedingBackfill: number;
  users: Array<{
    id: Doc<"users">["_id"];
    email: string | undefined;
    name: string | undefined;
  }>;
}

/**
 * Backfill action: Create default free entitlements for all existing users
 * who don't have one yet.
 *
 * Run this once after deploying the entitlements feature:
 * npx convex run actions/backfillEntitlements:backfillEntitlements
 */
export const backfillEntitlements = action({
  args: {},
  handler: async (ctx): Promise<BackfillResult> => {
    // Get users without entitlements
    const usersWithoutEntitlements: Doc<"users">[] = await ctx.runQuery(
      internal.backfillHelpers.getUsersWithoutEntitlements
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
  handler: async (ctx): Promise<EntitlementStatusResult> => {
    const usersWithoutEntitlements: Doc<"users">[] = await ctx.runQuery(
      internal.backfillHelpers.getUsersWithoutEntitlements
    );

    return {
      usersNeedingBackfill: usersWithoutEntitlements.length,
      users: usersWithoutEntitlements.map((u: Doc<"users">) => ({
        id: u._id,
        email: u.email,
        name: u.name,
      })),
    };
  },
});
