import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Internal query: Get users without entitlements (paginated for memory safety).
 * Returns up to `limit` users at a time, use cursor for pagination.
 */
export const getUsersWithoutEntitlements = internalQuery({
	args: {
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { cursor, limit = 100 }) => {
		// Get entitlements (using userId index for efficiency)
		const entitlements = await ctx.db.query("userEntitlements").collect();
		const usersWithEntitlements = new Set(entitlements.map((e) => e.userId.toString()));

		// Paginated user query
		const usersQuery = ctx.db.query("users");
		const paginatedResult = await usersQuery.paginate({
			cursor: cursor ?? null,
			numItems: limit,
		});

		// Filter to users without entitlements
		const usersNeedingEntitlements = paginatedResult.page.filter(
			(u) => !usersWithEntitlements.has(u._id.toString())
		);

		return {
			users: usersNeedingEntitlements,
			nextCursor: paginatedResult.continueCursor,
			isDone: paginatedResult.isDone,
		};
	},
});

/**
 * Internal mutation: Create entitlement for a single user.
 */
export const createEntitlementForUser = internalMutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, args): Promise<{ created: boolean }> => {
		// Validate user ID is provided
		if (!args.userId) {
			throw new Error("userId is required");
		}

		// Create default entitlement using the existing function
		const result: { created: boolean } = await ctx.runMutation(
			internal.entitlements.createDefaultEntitlement,
			{ userId: args.userId }
		);

		return result;
	},
});
