import { query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { TIER_LIMITS, type Tier, getTodayDateString } from "./lib/entitlements";

/**
 * Get user's current entitlements, limits, and usage.
 * Used by SSR pages to display tier info and limits.
 */
export const getUserEntitlements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) return null;

    const entitlement = await ctx.db
      .query("userEntitlements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    // Check for active bonus days from referral rewards
    const now = Date.now();
    const activeBonus = await ctx.db
      .query("referralRewards")
      .withIndex("by_user_active", (q) => q.eq("userId", user._id).gt("bonusDaysEnd", now))
      .first();

    const hasActiveBonusDays =
      activeBonus && activeBonus.bonusDaysEnd && activeBonus.bonusDaysEnd > now;

    // Determine effective tier: premium if subscribed OR has active bonus days
    const subscriptionTier: Tier = entitlement?.tier ?? "free";
    const tier: Tier = subscriptionTier === "premium" || hasActiveBonusDays ? "premium" : "free";
    const limits = TIER_LIMITS[tier];

    // Get current park count
    const userParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get today's pick count
    const today = getTodayDateString();
    const dailyPicks = await ctx.db
      .query("dailyPickCounts")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", today))
      .unique();

    const currentParks = userParks.length;
    const picksToday = dailyPicks?.pickCount ?? 0;

    return {
      tier,
      status: entitlement?.status ?? "active",
      limits: {
        maxParks: limits.maxParks === Infinity ? -1 : limits.maxParks,
        picksPerDay: limits.picksPerDay === Infinity ? -1 : limits.picksPerDay,
      },
      usage: {
        currentParks,
        picksToday,
      },
      canAddPark: currentParks < limits.maxParks,
      canPick: picksToday < limits.picksPerDay,
      periodEnd: entitlement?.periodEnd,
      // Bonus days info for UI display
      activeBonusDaysUntil: hasActiveBonusDays ? activeBonus.bonusDaysEnd : null,
    };
  },
});

/**
 * Internal: Check if user can add a park.
 * Returns limit details for error messages.
 */
export const checkCanAddPark = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const entitlement = await ctx.db
      .query("userEntitlements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    // Check for active bonus days
    const now = Date.now();
    const activeBonus = await ctx.db
      .query("referralRewards")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).gt("bonusDaysEnd", now))
      .first();

    const hasActiveBonusDays =
      activeBonus && activeBonus.bonusDaysEnd && activeBonus.bonusDaysEnd > now;
    const subscriptionTier: Tier = entitlement?.tier ?? "free";
    const tier: Tier = subscriptionTier === "premium" || hasActiveBonusDays ? "premium" : "free";
    const limit = TIER_LIMITS[tier].maxParks;

    const userParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      canAdd: userParks.length < limit,
      currentCount: userParks.length,
      limit: limit === Infinity ? -1 : limit,
      tier,
    };
  },
});

/**
 * Internal: Check if user can pick today.
 * Returns limit details for error messages.
 */
export const checkCanPickToday = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const entitlement = await ctx.db
      .query("userEntitlements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    // Check for active bonus days
    const now = Date.now();
    const activeBonus = await ctx.db
      .query("referralRewards")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).gt("bonusDaysEnd", now))
      .first();

    const hasActiveBonusDays =
      activeBonus && activeBonus.bonusDaysEnd && activeBonus.bonusDaysEnd > now;
    const subscriptionTier: Tier = entitlement?.tier ?? "free";
    const tier: Tier = subscriptionTier === "premium" || hasActiveBonusDays ? "premium" : "free";
    const limit = TIER_LIMITS[tier].picksPerDay;

    const today = getTodayDateString();
    const dailyPicks = await ctx.db
      .query("dailyPickCounts")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
      .unique();

    const currentCount = dailyPicks?.pickCount ?? 0;

    return {
      canPick: currentCount < limit,
      currentCount,
      limit: limit === Infinity ? -1 : limit,
      tier,
    };
  },
});

/**
 * Internal: Increment daily pick count after successful pick.
 */
export const incrementDailyPickCount = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = getTodayDateString();

    const existing = await ctx.db
      .query("dailyPickCounts")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { pickCount: existing.pickCount + 1 });
    } else {
      await ctx.db.insert("dailyPickCounts", {
        userId: args.userId,
        date: today,
        pickCount: 1,
      });
    }
  },
});

/**
 * Internal: Create or update entitlement from Clerk webhook.
 */
export const upsertFromClerkWebhook = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    clerkSubscriptionId: v.string(),
    clerkSubscriptionItemId: v.string(),
    clerkPlanId: v.string(),
    clerkPlanSlug: v.optional(v.string()),
    status: v.string(),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find user by Clerk token identifier
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();

    if (!user) {
      // Truncate token identifier to avoid logging PII
      const truncatedId =
        args.tokenIdentifier.length > 16
          ? `${args.tokenIdentifier.slice(0, 8)}...${args.tokenIdentifier.slice(-4)}`
          : "[redacted]";
      console.warn(`User not found for token identifier: ${truncatedId}`);
      return { success: false, reason: "user_not_found" };
    }

    // Determine tier from plan slug
    // Any plan that's not explicitly free is considered premium
    // This handles: "free_user" -> free, "monthly" -> premium, "yearly" -> premium
    const FREE_PLAN_SLUGS = ["free", "free_user", "trial"];
    const slugLower = args.clerkPlanSlug?.toLowerCase() ?? "";
    const tier: Tier = FREE_PLAN_SLUGS.some((slug) => slugLower.includes(slug))
      ? "free"
      : "premium";

    // Map Clerk status to our status
    type Status = "active" | "past_due" | "canceled" | "incomplete";
    const statusMap: Record<string, Status> = {
      active: "active",
      past_due: "past_due",
      canceled: "canceled",
      incomplete: "incomplete",
      ended: "canceled",
      upcoming: "active",
    };
    const status: Status = statusMap[args.status] ?? "active";

    const existing = await ctx.db
      .query("userEntitlements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tier,
        clerkSubscriptionId: args.clerkSubscriptionId,
        clerkSubscriptionItemId: args.clerkSubscriptionItemId,
        clerkPlanId: args.clerkPlanId,
        status,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userEntitlements", {
        userId: user._id,
        tier,
        clerkSubscriptionId: args.clerkSubscriptionId,
        clerkSubscriptionItemId: args.clerkSubscriptionItemId,
        clerkPlanId: args.clerkPlanId,
        status,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, tier, status };
  },
});

/**
 * Internal: Create default free entitlement for new users.
 */
export const createDefaultEntitlement = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userEntitlements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
      const now = Date.now();
      await ctx.db.insert("userEntitlements", {
        userId: args.userId,
        tier: "free",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      return { created: true };
    }

    return { created: false };
  },
});

/**
 * Internal: Get user's entitlement by userId.
 * Used for referral reward processing.
 */
export const getEntitlementByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userEntitlements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

/**
 * Internal: Downgrade user to free tier (e.g., when subscription canceled).
 */
export const downgradeToFree = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userEntitlements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tier: "free",
        status: "canceled",
        clerkSubscriptionId: undefined,
        clerkSubscriptionItemId: undefined,
        clerkPlanId: undefined,
        periodStart: undefined,
        periodEnd: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});
