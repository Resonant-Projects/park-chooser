import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate a user-friendly referral code.
 * Format: {USERNAME_PREFIX}-{RANDOM4}
 * Example: KEITH-A7X2
 */
function generateCode(name: string | undefined): string {
  // Extract prefix from name (4-6 alphanumeric chars, uppercase)
  const prefix = (name ?? "USER")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
    .padEnd(4, "X");

  // Generate 4 random alphanumeric characters
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude ambiguous chars (I, O, 0, 1)
  let random = "";
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${prefix}-${random}`;
}

/**
 * Get or create the current user's referral code.
 * Each user gets one active referral code.
 */
export const getOrCreateMyCode = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check for existing active code
    const existingCode = await ctx.db
      .query("referralCodes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingCode && existingCode.isActive) {
      return {
        code: existingCode.code,
        totalReferrals: existingCode.totalReferrals,
        createdAt: existingCode.createdAt,
      };
    }

    // Generate a new unique code
    let code = generateCode(user.name);
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await ctx.db
        .query("referralCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();

      if (!existing) break;
      code = generateCode(user.name);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Could not generate unique referral code");
    }

    // Deactivate any old codes for this user
    if (existingCode) {
      await ctx.db.patch(existingCode._id, { isActive: false });
    }

    // Create new code
    const now = Date.now();
    await ctx.db.insert("referralCodes", {
      userId: user._id,
      code,
      isActive: true,
      totalReferrals: 0,
      createdAt: now,
    });

    return {
      code,
      totalReferrals: 0,
      createdAt: now,
    };
  },
});

/**
 * Get current user's referral code (read-only).
 */
export const getMyCode = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return null;
    }

    const code = await ctx.db
      .query("referralCodes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!code || !code.isActive) {
      return null;
    }

    return {
      code: code.code,
      totalReferrals: code.totalReferrals,
      createdAt: code.createdAt,
    };
  },
});

/**
 * Validate a referral code (public, no auth required).
 * Used on the referral landing page.
 */
export const validateCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const codeRecord = await ctx.db
      .query("referralCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!codeRecord || !codeRecord.isActive) {
      return { valid: false, reason: "invalid_code" };
    }

    // Get referrer info for display
    const referrer = await ctx.db.get(codeRecord.userId);

    return {
      valid: true,
      referrerName: referrer?.name ?? "A friend",
    };
  },
});

/**
 * Internal: Increment referral count when someone converts.
 */
export const incrementReferralCount = internalMutation({
  args: { codeId: v.id("referralCodes") },
  handler: async (ctx, args) => {
    const code = await ctx.db.get(args.codeId);
    if (code) {
      await ctx.db.patch(args.codeId, {
        totalReferrals: code.totalReferrals + 1,
      });
    }
  },
});

/**
 * Internal: Get referral code by code string.
 */
export const getCodeByString = internalQuery({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("referralCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();
  },
});

/**
 * Get current user's referral stats (referred users, rewards earned).
 */
export const getMyReferralStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return null;
    }

    // Get all referrals by this user
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerId", user._id))
      .collect();

    // Count by status
    const pending = referrals.filter((r) => r.status === "pending").length;
    const converted = referrals.filter((r) => r.status === "converted").length;
    const rewarded = referrals.filter((r) => r.status === "rewarded").length;

    // Get rewards earned
    const rewards = await ctx.db
      .query("referralRewards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Check for active bonus days
    const now = Date.now();
    const activeBonusDays = rewards.find((r) => r.bonusDaysEnd && r.bonusDaysEnd > now);

    return {
      totalReferrals: referrals.length,
      pending,
      converted,
      rewarded,
      totalRewardsEarned: rewards.length,
      activeBonusDaysUntil: activeBonusDays?.bonusDaysEnd ?? null,
    };
  },
});
