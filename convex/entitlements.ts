import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getEffectiveTier, getTodayDateString, TIER_LIMITS } from "./lib/entitlements";
import { getUserFromIdentity } from "./lib/userHelpers";

/**
 * Get current user's entitlement
 */
export const getMyEntitlement = query({
	args: {},
	handler: async (ctx) => {
		const user = await getUserFromIdentity(ctx);
		if (!user) {
			return null;
		}

		const entitlement = await ctx.db
			.query("userEntitlements")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.unique();

		// Return default free tier if no entitlement exists
		if (!entitlement) {
			return {
				tier: "free" as const,
				status: "active" as const,
				effectiveTier: "free" as const,
				limits: TIER_LIMITS.free,
				periodStart: undefined,
				periodEnd: undefined,
				isFreeTrial: undefined,
			};
		}

		const effectiveTier = getEffectiveTier(entitlement);

		return {
			...entitlement,
			effectiveTier,
			limits: TIER_LIMITS[effectiveTier],
		};
	},
});

/**
 * Internal: Get entitlement by user ID
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
 * Internal: Check if user can pick today
 */
export const checkCanPickToday = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const entitlement = await ctx.db
			.query("userEntitlements")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.unique();

		// Use effective tier to honor paid period after cancellation
		const tier = entitlement ? getEffectiveTier(entitlement) : "free";
		const limit = TIER_LIMITS[tier].picksPerDay;

		// Premium users can always pick
		if (limit === Number.MAX_SAFE_INTEGER) {
			return { canPick: true, tier, limit, currentCount: 0 };
		}

		// Check today's pick count
		const today = getTodayDateString();
		const dailyCount = await ctx.db
			.query("dailyPickCounts")
			.withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
			.unique();

		const currentCount = dailyCount?.pickCount ?? 0;

		return {
			canPick: currentCount < limit,
			tier,
			limit,
			currentCount,
		};
	},
});

/**
 * Internal: Increment daily pick count
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
			await ctx.db.patch(existing._id, {
				pickCount: existing.pickCount + 1,
			});
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
 * Internal: Create default entitlement for new user
 */
export const createDefaultEntitlement = internalMutation({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		// Check if already exists
		const existing = await ctx.db
			.query("userEntitlements")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.unique();

		if (existing) {
			return { created: false, entitlementId: existing._id };
		}

		const now = Date.now();
		const entitlementId = await ctx.db.insert("userEntitlements", {
			userId: args.userId,
			tier: "free",
			status: "active",
			createdAt: now,
			updatedAt: now,
		});

		return { created: true, entitlementId };
	},
});

/**
 * Internal: Upsert entitlement from Clerk webhook
 */
export const upsertFromClerkWebhook = internalMutation({
	args: {
		userId: v.id("users"),
		clerkSubscriptionId: v.optional(v.string()),
		clerkSubscriptionItemId: v.optional(v.string()),
		clerkPlanId: v.optional(v.string()),
		clerkPlanSlug: v.optional(v.string()),
		status: v.string(),
		periodStart: v.optional(v.number()),
		periodEnd: v.optional(v.number()),
		isFreeTrial: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		// Determine tier from plan slug
		const tier = args.clerkPlanSlug?.includes("premium") ? "premium" : "free";

		// Map Clerk status to our status
		let status: "active" | "past_due" | "canceled" | "incomplete" = "active";
		if (args.status === "canceled" || args.status === "ended") {
			status = "canceled";
		} else if (args.status === "past_due") {
			status = "past_due";
		} else if (args.status === "incomplete") {
			status = "incomplete";
		}

		// Check for existing entitlement
		const existing = await ctx.db
			.query("userEntitlements")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				// Set tier from plan slug; getEffectiveTier() handles access based on periodEnd
				tier,
				clerkSubscriptionId: args.clerkSubscriptionId,
				clerkSubscriptionItemId: args.clerkSubscriptionItemId,
				clerkPlanId: args.clerkPlanId,
				status,
				periodStart: args.periodStart,
				periodEnd: args.periodEnd,
				isFreeTrial: args.isFreeTrial,
				updatedAt: now,
			});
			return { updated: true, entitlementId: existing._id };
		}

		// Create new entitlement
		const entitlementId = await ctx.db.insert("userEntitlements", {
			userId: args.userId,
			// Set tier from plan slug; getEffectiveTier() handles access based on periodEnd
			tier,
			clerkSubscriptionId: args.clerkSubscriptionId,
			clerkSubscriptionItemId: args.clerkSubscriptionItemId,
			clerkPlanId: args.clerkPlanId,
			status,
			periodStart: args.periodStart,
			periodEnd: args.periodEnd,
			isFreeTrial: args.isFreeTrial,
			createdAt: now,
			updatedAt: now,
		});

		return { updated: false, entitlementId };
	},
});
