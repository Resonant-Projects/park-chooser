import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { getUserFromIdentity } from "./lib/userHelpers";

/**
 * Submit user feedback
 */
export const submit = mutation({
	args: {
		rating: v.number(),
		likesText: v.optional(v.string()),
		improvementsText: v.optional(v.string()),
		featureRequestsText: v.optional(v.string()),
	},
	handler: async (ctx, { rating, likesText, improvementsText, featureRequestsText }) => {
		const user = await getUserFromIdentity(ctx);
		if (!user) {
			throw new Error("Must be authenticated to submit feedback");
		}

		// Validate rating is an integer between 1-5
		if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
			throw new Error("Rating must be an integer between 1 and 5");
		}

		const feedbackId = await ctx.db.insert("feedback", {
			userId: user._id,
			rating,
			likesText,
			improvementsText,
			featureRequestsText,
			createdAt: Date.now(),
		});

		return { feedbackId };
	},
});

/**
 * Get feedback for the current authenticated user (to check if they already submitted)
 */
export const getByCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const user = await getUserFromIdentity(ctx);
		if (!user) {
			return null;
		}

		return await ctx.db
			.query("feedback")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.order("desc")
			.first();
	},
});

/**
 * Get feedback by user ID (internal only - for admin purposes)
 */
export const getByUser = internalQuery({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, { userId }) => {
		return await ctx.db
			.query("feedback")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.order("desc")
			.first();
	},
});

/**
 * List all feedback (for admin - internal only)
 */
export const list = internalQuery({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { limit }) => {
		const q = ctx.db.query("feedback").withIndex("by_created").order("desc");

		if (limit) {
			return await q.take(limit);
		}
		return await q.collect();
	},
});

/**
 * Get average rating
 */
export const getAverageRating = query({
	args: {},
	handler: async (ctx) => {
		const allFeedback = await ctx.db.query("feedback").collect();

		if (allFeedback.length === 0) {
			return { average: 0, count: 0 };
		}

		const total = allFeedback.reduce((sum, f) => sum + f.rating, 0);
		return {
			average: Math.round((total / allFeedback.length) * 10) / 10,
			count: allFeedback.length,
		};
	},
});
