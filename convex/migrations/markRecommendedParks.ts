import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * One-time migration: Mark all existing parks as recommended (paginated for memory safety).
 * Run with: npx convex run migrations/markRecommendedParks:markRecommendedParks
 * Note: This is an internal mutation - not exposed to public API
 * For large datasets, run multiple times with cursor until isDone is true.
 */
export const markRecommendedParks = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		batchSize: v.optional(v.number()),
	},
	handler: async (ctx, { cursor, batchSize = 100 }) => {
		const paginatedResult = await ctx.db.query("parks").paginate({
			cursor: cursor ?? null,
			numItems: batchSize,
		});

		for (const park of paginatedResult.page) {
			await ctx.db.patch(park._id, { isRecommended: true });
		}

		return {
			updated: paginatedResult.page.length,
			nextCursor: paginatedResult.continueCursor,
			isDone: paginatedResult.isDone,
		};
	},
});
