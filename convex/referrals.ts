import {
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal: Create a pending referral when a new user signs up with a code.
 */
export const createPendingReferral = internalMutation({
  args: {
    referralCodeId: v.id("referralCodes"),
    referrerId: v.id("users"),
    refereeId: v.id("users"),
    signupIpHash: v.optional(v.string()),
    signupDeviceFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if referee already has a referral record (prevents double-referral)
    const existingReferral = await ctx.db
      .query("referrals")
      .withIndex("by_referee", (q) => q.eq("refereeId", args.refereeId))
      .first();

    if (existingReferral) {
      return { success: false, reason: "already_referred" };
    }

    // Prevent self-referral
    if (args.referrerId === args.refereeId) {
      return { success: false, reason: "self_referral" };
    }

    const now = Date.now();
    const referralId = await ctx.db.insert("referrals", {
      referrerId: args.referrerId,
      refereeId: args.refereeId,
      referralCodeId: args.referralCodeId,
      status: "pending",
      signupAt: now,
      signupIpHash: args.signupIpHash,
      signupDeviceFingerprint: args.signupDeviceFingerprint,
    });

    return { success: true, referralId };
  },
});

/**
 * Internal: Get pending referral for a user (if any).
 * Used when processing subscription webhooks to check if user was referred.
 */
export const getPendingReferralByReferee = internalQuery({
  args: { refereeId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("referrals")
      .withIndex("by_referee", (q) => q.eq("refereeId", args.refereeId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
  },
});

/**
 * Internal: Mark referral as converted and schedule reward.
 */
export const markReferralConverted = internalMutation({
  args: { referralId: v.id("referrals") },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral || referral.status !== "pending") {
      return { success: false, reason: "invalid_referral" };
    }

    const now = Date.now();

    // 48-hour minimum delay check
    const hoursSinceSignup = (now - referral.signupAt) / (1000 * 60 * 60);
    if (hoursSinceSignup < 48) {
      return { success: false, reason: "too_soon" };
    }

    await ctx.db.patch(args.referralId, {
      status: "converted",
      convertedAt: now,
    });

    return { success: true, referrerId: referral.referrerId };
  },
});

/**
 * Internal: Mark referral as rewarded after granting reward.
 */
export const markReferralRewarded = internalMutation({
  args: { referralId: v.id("referrals") },
  handler: async (ctx, args) => {
    // Validate referral exists and is in correct status
    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      throw new Error("Referral not found");
    }
    if (referral.status !== "converted") {
      throw new Error(`Cannot mark referral as rewarded: current status is "${referral.status}", expected "converted"`);
    }

    const now = Date.now();
    await ctx.db.patch(args.referralId, {
      status: "rewarded",
      rewardGrantedAt: now,
    });
  },
});

/**
 * Internal: Mark referral as fraudulent.
 */
export const markReferralFraudulent = internalMutation({
  args: {
    referralId: v.id("referrals"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate referral exists
    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      throw new Error("Referral not found");
    }

    await ctx.db.patch(args.referralId, {
      status: "fraudulent",
      fraudReason: args.reason,
    });
  },
});

/**
 * Internal: Mark expired referrals (90 days without conversion).
 * Called periodically by a scheduled job.
 */
export const markExpiredReferrals = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expirationThreshold = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days

    const pendingReferrals = await ctx.db
      .query("referrals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    let expiredCount = 0;
    for (const referral of pendingReferrals) {
      if (referral.signupAt < expirationThreshold) {
        await ctx.db.patch(referral._id, { status: "expired" });
        expiredCount++;
      }
    }

    return { expiredCount };
  },
});

/**
 * Internal: Check if user has exceeded referral reward limits.
 * Max 12 months total rewards, max 3 per month.
 */
export const checkRewardLimits = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rewards = await ctx.db
      .query("referralRewards")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Max 12 total rewards
    if (rewards.length >= 12) {
      return { canReceiveReward: false, reason: "max_total_reached" };
    }

    // Max 3 per month
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentRewards = rewards.filter((r) => r.grantedAt > thirtyDaysAgo);
    if (recentRewards.length >= 3) {
      return { canReceiveReward: false, reason: "monthly_limit_reached" };
    }

    return { canReceiveReward: true };
  },
});
