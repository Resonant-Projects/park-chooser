import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import {
	createLimitError,
	ENTITLEMENT_ERRORS,
	getEffectiveTier,
	TIER_LIMITS,
} from "./lib/entitlements";

/**
 * Get user's park list with park details
 */
export const getMyParks = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return [];
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique();

		if (!user) {
			return [];
		}

		const userParks = await ctx.db
			.query("userParks")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();

		// Fetch park details for each userPark
		const parksWithDetails = await Promise.all(
			userParks.map(async (up) => {
				const park = await ctx.db.get(up.parkId);
				if (!park) return null;
				return {
					...up,
					park,
				};
			})
		);

		return parksWithDetails.filter((p) => p !== null);
	},
});

/**
 * Get count of user's parks
 */
export const getUserParkCount = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return 0;
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique();

		if (!user) {
			return 0;
		}

		const userParks = await ctx.db
			.query("userParks")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();

		return userParks.length;
	},
});

/**
 * Add a park to user's list
 */
export const addPark = mutation({
	args: {
		parkId: v.id("parks"),
		customName: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Must be authenticated to add parks");
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique();

		if (!user) {
			throw new Error("User not found");
		}

		// Check if park already in user's list
		const existing = await ctx.db
			.query("userParks")
			.withIndex("by_user_park", (q) => q.eq("userId", user._id).eq("parkId", args.parkId))
			.unique();

		if (existing) {
			throw new Error("Park already in your list");
		}

		// Check entitlement limits
		const entitlement = await ctx.db
			.query("userEntitlements")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.unique();

		const tier = entitlement ? getEffectiveTier(entitlement) : "free";
		const limit = TIER_LIMITS[tier].maxParks;

		const currentCount = (
			await ctx.db
				.query("userParks")
				.withIndex("by_user", (q) => q.eq("userId", user._id))
				.collect()
		).length;

		if (currentCount >= limit) {
			throw createLimitError(
				ENTITLEMENT_ERRORS.PARK_LIMIT_EXCEEDED,
				`Park limit reached (${currentCount}/${limit}). Upgrade to Premium for unlimited parks.`,
				{
					tier,
					limit,
					current: currentCount,
				}
			);
		}

		// Add park to user's list
		return await ctx.db.insert("userParks", {
			userId: user._id,
			parkId: args.parkId,
			customName: args.customName,
			addedAt: Date.now(),
			visitCount: 0,
		});
	},
});

/**
 * Remove a park from user's list
 */
export const removePark = mutation({
	args: {
		userParkId: v.id("userParks"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Must be authenticated to remove parks");
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique();

		if (!user) {
			throw new Error("User not found");
		}

		const userPark = await ctx.db.get(args.userParkId);
		if (!userPark || userPark.userId !== user._id) {
			throw new Error("Park not found in your list");
		}

		await ctx.db.delete(args.userParkId);
	},
});

/**
 * Internal: Get user parks with details for picking
 */
export const getUserParksWithDetails = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const userParks = await ctx.db
			.query("userParks")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();

		const parksWithDetails = await Promise.all(
			userParks.map(async (up) => {
				const park = await ctx.db.get(up.parkId);
				if (!park) return null;
				return {
					_id: up._id,
					parkId: up.parkId,
					placeId: park.placeId,
					name: park.name,
					customName: up.customName,
					address: park.address,
					photoRefs: park.photoRefs,
				};
			})
		);

		return parksWithDetails.filter((p) => p !== null);
	},
});

/**
 * Internal: Get last 5 picked park IDs for user
 */
export const getLastFivePickIdsForUser = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const recentPicks = await ctx.db
			.query("picks")
			.withIndex("by_user_chosenAt", (q) => q.eq("userId", args.userId))
			.order("desc")
			.take(5);

		return recentPicks.map((p) => p.parkId);
	},
});

/**
 * Internal: Get user's park IDs (for checking if park is in list)
 */
export const getUserParkIds = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const userParks = await ctx.db
			.query("userParks")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();

		return userParks.map((up) => up.parkId.toString());
	},
});

/**
 * Internal: Seed user with parks (for new users)
 */
export const seedUserParksInternal = internalMutation({
	args: {
		userId: v.id("users"),
		parkIds: v.array(v.id("parks")),
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		for (const parkId of args.parkIds) {
			// Check if already exists
			const existing = await ctx.db
				.query("userParks")
				.withIndex("by_user_park", (q) => q.eq("userId", args.userId).eq("parkId", parkId))
				.unique();

			if (!existing) {
				await ctx.db.insert("userParks", {
					userId: args.userId,
					parkId,
					addedAt: now,
					visitCount: 0,
				});
			}
		}
	},
});

/**
 * Internal: Increment visit count for a user's park
 */
export const incrementUserParkVisit = internalMutation({
	args: {
		userId: v.id("users"),
		parkId: v.id("parks"),
	},
	handler: async (ctx, args) => {
		const userPark = await ctx.db
			.query("userParks")
			.withIndex("by_user_park", (q) => q.eq("userId", args.userId).eq("parkId", args.parkId))
			.unique();

		if (userPark) {
			await ctx.db.patch(userPark._id, {
				visitCount: userPark.visitCount + 1,
				lastVisitedAt: Date.now(),
			});
		}
	},
});

/**
 * Get user's parks sorted by visit count (for stats)
 */
export const getMyParksByVisits = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return [];
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique();

		if (!user) {
			return [];
		}

		const userParks = await ctx.db
			.query("userParks")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();

		// Fetch park details and sort by visit count
		const parksWithDetails = await Promise.all(
			userParks.map(async (up) => {
				const park = await ctx.db.get(up.parkId);
				if (!park) return null;
				return {
					...up,
					park,
				};
			})
		);

		return parksWithDetails
			.filter((p) => p !== null)
			.sort((a, b) => b.visitCount - a.visitCount);
	},
});
