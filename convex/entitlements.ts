import { query, internalQuery, internalMutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { TIER_LIMITS, type Tier, getTodayDateString, UNLIMITED } from "./lib/entitlements";

/**
 * Helper: Get effective tier for a user, considering both subscription and bonus days.
 * This centralizes the tier calculation logic used throughout entitlements.
 */
async function getEffectiveTier(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<{
  tier: Tier;
  hasActiveBonusDays: boolean;
  activeBonusDaysEnd: number | null;
  entitlementStatus: "active" | "past_due" | "canceled" | "incomplete";
  periodEnd?: number;
}> {
  const entitlement = await ctx.db
    .query("userEntitlements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  // Check for active bonus days from referral rewards
  const now = Date.now();
  const activeBonus = await ctx.db
    .query("referralRewards")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).gt("bonusDaysEnd", now))
    .first();

  const hasActiveBonusDays = Boolean(
    activeBonus && activeBonus.bonusDaysEnd && activeBonus.bonusDaysEnd > now
  );

  // Determine effective tier: premium if subscribed OR has active bonus days
  const subscriptionTier: Tier = entitlement?.tier ?? "free";
  const tier: Tier = subscriptionTier === "premium" || hasActiveBonusDays ? "premium" : "free";

  return {
    tier,
    hasActiveBonusDays,
    activeBonusDaysEnd: hasActiveBonusDays ? (activeBonus?.bonusDaysEnd ?? null) : null,
    entitlementStatus: entitlement?.status ?? "active",
    periodEnd: entitlement?.periodEnd,
  };
}

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

    // Use shared helper for tier calculation
    const { tier, hasActiveBonusDays, activeBonusDaysEnd, entitlementStatus, periodEnd } =
      await getEffectiveTier(ctx, user._id);
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
      status: entitlementStatus,
      limits: {
        maxParks: limits.maxParks === UNLIMITED ? -1 : limits.maxParks,
        picksPerDay: limits.picksPerDay === UNLIMITED ? -1 : limits.picksPerDay,
      },
      usage: {
        currentParks,
        picksToday,
      },
      canAddPark: currentParks < limits.maxParks,
      canPick: picksToday < limits.picksPerDay,
      periodEnd,
      // Bonus days info for UI display
      activeBonusDaysUntil: hasActiveBonusDays ? activeBonusDaysEnd : null,
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
    // Use shared helper for tier calculation
    const { tier } = await getEffectiveTier(ctx, args.userId);
    const limit = TIER_LIMITS[tier].maxParks;

    const userParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      canAdd: userParks.length < limit,
      currentCount: userParks.length,
      limit: limit === UNLIMITED ? -1 : limit,
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
    // Use shared helper for tier calculation
    const { tier } = await getEffectiveTier(ctx, args.userId);
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
      limit: limit === UNLIMITED ? -1 : limit,
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
 * Now accepts userId directly (looked up via getUserByClerkId in http.ts).
 */
export const upsertFromClerkWebhook = internalMutation({
  args: {
    userId: v.id("users"),
    clerkSubscriptionId: v.string(),
    clerkSubscriptionItemId: v.string(),
    clerkPlanId: v.optional(v.string()),
    clerkPlanSlug: v.optional(v.string()),
    status: v.string(),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Log webhook event (without sensitive identifiers)
    console.log("Webhook entitlement update:", {
      status: args.status,
      planSlug: args.clerkPlanSlug,
    });

    // Only grant premium when ALL conditions are met:
    // 1. Status is active or past_due (valid subscription states)
    // 2. Subscription ID exists
    // 3. Plan slug is "monthly" (the premium plan, not "free_user")
    const validPaidStatuses = ["active", "past_due"];
    const isPremiumPlan = args.clerkPlanSlug === "monthly";
    const hasPaidSubscription =
      validPaidStatuses.includes(args.status) && Boolean(args.clerkSubscriptionId) && isPremiumPlan;
    const tier: Tier = hasPaidSubscription ? "premium" : "free";

    // Debug: tier computation result
    if (process.env.DEBUG_ENTITLEMENTS) {
      console.log("Computed tier:", { tier, isPremiumPlan, hasPaidSubscription });
    }

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
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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
        userId: args.userId,
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
