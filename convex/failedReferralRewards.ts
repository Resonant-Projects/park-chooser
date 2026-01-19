import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal: Record a failed referral reward grant for later retry.
 */
export const recordFailedReward = internalMutation({
  args: {
    referralId: v.id("referrals"),
    userId: v.id("users"),
    rewardType: v.union(v.literal("bonus_days"), v.literal("discount_code")),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if a failed reward record already exists for this referral
    const existing = await ctx.db
      .query("failedReferralRewards")
      .withIndex("by_referral", (q) => q.eq("referralId", args.referralId))
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        error: args.error,
        retryCount: 0,
        lastAttemptAt: now,
        status: "pending",
      });
      return existing._id;
    }

    // Create new record
    const failedRewardId = await ctx.db.insert("failedReferralRewards", {
      referralId: args.referralId,
      userId: args.userId,
      rewardType: args.rewardType,
      error: args.error,
      retryCount: 0,
      lastAttemptAt: now,
      status: "pending",
      createdAt: now,
    });

    return failedRewardId;
  },
});

/**
 * Internal: Get failed rewards that are pending retry.
 */
export const getFailedRewardsForRetry = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("failedReferralRewards")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

/**
 * Internal: Mark a failed reward as resolved after successful retry.
 */
export const markResolved = internalMutation({
  args: { failedRewardId: v.id("failedReferralRewards") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.failedRewardId, {
      status: "resolved",
    });
  },
});

/**
 * Internal: Increment retry count and escalate if max attempts reached.
 */
export const incrementRetryCount = internalMutation({
  args: {
    failedRewardId: v.id("failedReferralRewards"),
    maxRetries: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const failedReward = await ctx.db.get(args.failedRewardId);
    if (!failedReward) {
      throw new Error("Failed reward not found");
    }

    const newRetryCount = failedReward.retryCount + 1;
    const maxRetries = args.maxRetries ?? 3;

    await ctx.db.patch(args.failedRewardId, {
      retryCount: newRetryCount,
      lastAttemptAt: Date.now(),
      status: newRetryCount >= maxRetries ? "escalated" : "pending",
    });

    return {
      retryCount: newRetryCount,
      status: newRetryCount >= maxRetries ? "escalated" : "pending",
    };
  },
});
