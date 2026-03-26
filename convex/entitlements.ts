import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getEffectiveTier, getTodayDateString, TIER_LIMITS } from "./lib/entitlements";
import { getUserFromIdentity } from "./lib/userHelpers";

// Exact-match list for optional supporter plans. Unrecognized slugs fall through to
// "free" with a warning log.
const KNOWN_PREMIUM_SLUGS = ["premium", "monthly"];

function resolveTier(slug: string | undefined): "premium" | "free" {
	if (slug === undefined) {
		console.warn("[resolveTier] Plan slug is undefined — defaulting to free");
		return "free";
	}
	if (KNOWN_PREMIUM_SLUGS.includes(slug)) {
		return "premium";
	}
	console.warn(`[resolveTier] Unrecognized plan slug "${slug}" — defaulting to free`);
	return "free";
}

/**
 * Get current user's billing/supporter state.
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

		// Default to the free label when the user has no supporter subscription.
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

		// Limits are no longer gated by billing state, but we still compute the effective
		// tier so the caller can show accurate supporter messaging when needed.
		const tier = entitlement ? getEffectiveTier(entitlement) : "free";
		const limit = TIER_LIMITS[tier].picksPerDay;

		// Unlimited tiers can always pick.
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
 * Internal: Upsert supporter billing state from Clerk webhook
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
		eventTimestamp: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		// Determine the descriptive tier from the plan slug
		const tier = resolveTier(args.clerkPlanSlug);

		// Map Clerk status to our local supporter status
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
			// Skip stale events — don't overwrite newer state with older webhook data
			if (args.eventTimestamp && existing.updatedAt > args.eventTimestamp) {
				console.warn(
					`[upsertFromClerkWebhook] Skipping stale event (event: ${args.eventTimestamp}, existing: ${existing.updatedAt})`
				);
				return { updated: false, entitlementId: existing._id, skipped: true };
			}

			await ctx.db.patch(existing._id, {
				// Only update tier if plan slug was provided, to avoid overwriting with "free"
				...(args.clerkPlanSlug !== undefined ? { tier } : {}),
				clerkSubscriptionId: args.clerkSubscriptionId,
				clerkSubscriptionItemId: args.clerkSubscriptionItemId,
				clerkPlanId: args.clerkPlanId,
				status,
				periodStart: args.periodStart,
				periodEnd: args.periodEnd,
				isFreeTrial: args.isFreeTrial,
				updatedAt: args.eventTimestamp ?? now,
			});
			return { updated: true, entitlementId: existing._id };
		}

		// Create new entitlement
		const entitlementId = await ctx.db.insert("userEntitlements", {
			userId: args.userId,
			// Store the tier label from the plan slug for supporter/account messaging.
			tier,
			clerkSubscriptionId: args.clerkSubscriptionId,
			clerkSubscriptionItemId: args.clerkSubscriptionItemId,
			clerkPlanId: args.clerkPlanId,
			status,
			periodStart: args.periodStart,
			periodEnd: args.periodEnd,
			isFreeTrial: args.isFreeTrial,
			createdAt: now,
			updatedAt: args.eventTimestamp ?? now,
		});

		return { updated: false, entitlementId };
	},
});
