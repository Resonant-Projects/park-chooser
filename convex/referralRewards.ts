import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal: Grant bonus days to a referrer (for existing premium subscribers).
 * Adds 30 days of premium access that stacks with existing subscription.
 */
export const grantBonusDays = internalMutation({
  args: {
    userId: v.id("users"),
    referralId: v.id("referrals"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    // Check for existing active bonus days to stack
    const existingBonus = await ctx.db
      .query("referralRewards")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).gt("bonusDaysEnd", now))
      .first();

    let bonusDaysStart: number;
    let bonusDaysEnd: number;

    if (existingBonus && existingBonus.bonusDaysEnd) {
      // Stack on top of existing bonus
      bonusDaysStart = existingBonus.bonusDaysEnd;
      bonusDaysEnd = bonusDaysStart + thirtyDays;
    } else {
      // Start from now
      bonusDaysStart = now;
      bonusDaysEnd = now + thirtyDays;
    }

    const rewardId = await ctx.db.insert("referralRewards", {
      userId: args.userId,
      referralId: args.referralId,
      rewardType: "free_month",
      grantedAt: now,
      bonusDaysStart,
      bonusDaysEnd,
    });

    return { rewardId, bonusDaysEnd };
  },
});

/**
 * Internal: Generate a discount code for free-tier referrers.
 * They can use this when upgrading to get their first month free.
 */
export const grantDiscountCode = internalMutation({
  args: {
    userId: v.id("users"),
    referralId: v.id("referrals"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const maxAttempts = 10;

    // Generate a unique discount code with collision check
    let discountCode: string | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let candidateCode = "REF-";
      for (let i = 0; i < 8; i++) {
        candidateCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Check if code already exists
      const existing = await ctx.db
        .query("referralRewards")
        .filter((q) => q.eq(q.field("discountCode"), candidateCode))
        .first();

      if (!existing) {
        discountCode = candidateCode;
        break;
      }
    }

    if (!discountCode) {
      throw new Error("Failed to generate unique discount code. Please try again.");
    }

    const rewardId = await ctx.db.insert("referralRewards", {
      userId: args.userId,
      referralId: args.referralId,
      rewardType: "free_month",
      grantedAt: now,
      discountCode,
    });

    return { rewardId, discountCode };
  },
});

/**
 * Internal: Mark discount code as used.
 */
export const markDiscountUsed = internalMutation({
  args: { rewardId: v.id("referralRewards") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.rewardId, {
      discountUsedAt: Date.now(),
    });
  },
});

/**
 * Internal: Check if user has active bonus days.
 * Used in entitlement checks to grant premium access during bonus period.
 */
export const hasActiveBonusDays = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const activeBonus = await ctx.db
      .query("referralRewards")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).gt("bonusDaysEnd", now))
      .first();

    if (activeBonus && activeBonus.bonusDaysEnd) {
      return {
        hasBonus: true,
        bonusDaysEnd: activeBonus.bonusDaysEnd,
      };
    }

    return { hasBonus: false };
  },
});

/**
 * Internal: Get all unused discount codes for a user.
 */
export const getUnusedDiscountCodes = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rewards = await ctx.db
      .query("referralRewards")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(q.neq(q.field("discountCode"), undefined), q.eq(q.field("discountUsedAt"), undefined))
      )
      .collect();

    return rewards.map((r) => ({
      code: r.discountCode!,
      grantedAt: r.grantedAt,
    }));
  },
});
