import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getTodayDateString } from "./lib/entitlements";

/**
 * Get recent picks for display
 */
export const getRecent = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
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

		const picks = await ctx.db
			.query("picks")
			.withIndex("by_user_chosenAt", (q) => q.eq("userId", user._id))
			.order("desc")
			.take(args.limit ?? 10);

		// Fetch park details for each pick
		const picksWithDetails = await Promise.all(
			picks.map(async (pick) => {
				const park = await ctx.db.get(pick.parkId);
				return {
					...pick,
					park,
				};
			})
		);

		// Filter out picks where the park no longer exists
		return picksWithDetails.filter((pick) => pick.park !== null);
	},
});

/**
 * Internal: Record a pick
 */
export const recordPick = internalMutation({
	args: {
		parkId: v.id("parks"),
		userId: v.id("users"),
		userParkId: v.optional(v.id("userParks")),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("picks", {
			parkId: args.parkId,
			userId: args.userId,
			userParkId: args.userParkId,
			chosenAt: Date.now(),
		});
	},
});

/**
 * Internal: Get today's pick for a user
 */
export const getTodaysPickForUser = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const todayStart = new Date();
		todayStart.setUTCHours(0, 0, 0, 0);

		// Query picks from today only by using a filter
		// We order desc and take more to ensure we don't miss today's picks
		const picks = await ctx.db
			.query("picks")
			.withIndex("by_user_chosenAt", (q) => q.eq("userId", args.userId))
			.order("desc")
			.filter((q) => q.gte(q.field("chosenAt"), todayStart.getTime()))
			.first();

		// Get the most recent pick from today
		const todaysPick = picks;

		if (!todaysPick) {
			return null;
		}

		// Get park details
		const park = await ctx.db.get(todaysPick.parkId);
		if (!park) {
			return null;
		}

		// Get userPark for custom name
		let customName: string | undefined;
		if (todaysPick.userParkId) {
			const userPark = await ctx.db.get(todaysPick.userParkId);
			customName = userPark?.customName;
		}

		return {
			parkId: park._id,
			name: park.name,
			customName,
			address: park.address,
			placeId: park.placeId,
			photoRefs: park.photoRefs,
			chosenAt: todaysPick.chosenAt,
		};
	},
});

/**
 * Get today's pick count for user (for rate limiting display)
 */
export const getTodaysPickCount = query({
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

		const today = getTodayDateString();

		const dailyCount = await ctx.db
			.query("dailyPickCounts")
			.withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", today))
			.unique();

		return dailyCount?.pickCount ?? 0;
	},
});
