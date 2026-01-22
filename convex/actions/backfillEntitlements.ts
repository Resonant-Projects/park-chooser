"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";

interface BackfillResult {
  success: boolean;
  message: string;
  created: number;
  total?: number;
  errors?: string[];
}

interface EntitlementStatusResult {
  usersNeedingBackfill: number;
  sampleUsers: Array<{
    id: Doc<"users">["_id"];
    email: string | undefined;
    name: string | undefined;
  }>;
}

interface PaginatedUsersResult {
  users: Doc<"users">[];
  nextCursor: string | null;
  isDone: boolean;
}

/**
 * Backfill action: Create default free entitlements for all existing users
 * who don't have one yet.
 *
 * Run this once after deploying the entitlements feature:
 * npx convex run actions/backfillEntitlements:backfillEntitlements
 */
export const backfillEntitlements = internalAction({
  args: {},
  handler: async (ctx): Promise<BackfillResult> => {
    let created = 0;
    let totalFound = 0;
    const errors: string[] = [];
    let cursor: string | null = null;

    // Process users in paginated batches for memory safety
    do {
      const result: PaginatedUsersResult = await ctx.runQuery(
        internal.backfillHelpers.getUsersWithoutEntitlements,
        { cursor: cursor ?? undefined, limit: 100 }
      );

      const usersWithoutEntitlements = result.users;
      totalFound += usersWithoutEntitlements.length;

      console.log(
        `Processing batch: ${usersWithoutEntitlements.length} users without entitlements`
      );

      // Create entitlements for each user in this batch
      for (const user of usersWithoutEntitlements) {
        try {
          const createResult = await ctx.runMutation(
            internal.entitlements.createDefaultEntitlement,
            { userId: user._id }
          );

          if (createResult.created) {
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

      cursor = result.isDone ? null : result.nextCursor;
    } while (cursor);

    if (totalFound === 0) {
      return {
        success: true,
        message: "No users need entitlement backfill",
        created: 0,
      };
    }

    return {
      success: errors.length === 0,
      message: `Created ${created} entitlements out of ${totalFound} users`,
      created,
      total: totalFound,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

/**
 * Check status: How many users are missing entitlements?
 * Returns count and a sample of up to 10 users to avoid OOM on large datasets.
 *
 * Run to check before/after backfill:
 * npx convex run actions/backfillEntitlements:checkEntitlementStatus
 */
export const checkEntitlementStatus = internalAction({
  args: {},
  handler: async (ctx): Promise<EntitlementStatusResult> => {
    const sampleUsers: Array<{
      id: Doc<"users">["_id"];
      email: string | undefined;
      name: string | undefined;
    }> = [];
    let totalCount = 0;
    let cursor: string | null = null;

    // Count users without entitlements and collect a sample (max 10)
    do {
      const result: PaginatedUsersResult = await ctx.runQuery(
        internal.backfillHelpers.getUsersWithoutEntitlements,
        { cursor: cursor ?? undefined, limit: 100 }
      );

      totalCount += result.users.length;

      // Collect sample (first 10 users only)
      for (const user of result.users) {
        if (sampleUsers.length < 10) {
          sampleUsers.push({
            id: user._id,
            email: user.email,
            name: user.name,
          });
        }
      }

      cursor = result.isDone ? null : result.nextCursor;
    } while (cursor);

    return {
      usersNeedingBackfill: totalCount,
      sampleUsers,
    };
  },
});
