import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

/**
 * Store or update user from authentication.
 * Handles both new users and webhook-created users (sets tokenIdentifier).
 */
export const store = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Called store without authentication present");
		}

		// Check if we've already stored this identity before
		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique();

		if (user !== null) {
			// Update existing user
			if (user.name !== identity.name || user.imageUrl !== identity.pictureUrl) {
				await ctx.db.patch(user._id, {
					name: identity.name ?? undefined,
					imageUrl: identity.pictureUrl ?? undefined,
				});
			}
			return user._id;
		}

		// Check if user was created via webhook (has clerkUserId but no tokenIdentifier yet)
		// The JWT subject claim contains the Clerk user ID
		const clerkUserId = identity.subject;
		if (clerkUserId) {
			const webhookUser = await ctx.db
				.query("users")
				.withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
				.unique();

			if (webhookUser) {
				// Update with the correct tokenIdentifier from JWT
				await ctx.db.patch(webhookUser._id, {
					tokenIdentifier: identity.tokenIdentifier,
					name: identity.name ?? webhookUser.name,
					imageUrl: identity.pictureUrl ?? webhookUser.imageUrl,
				});
				return webhookUser._id;
			}
		}

		// Create new user
		const userId = await ctx.db.insert("users", {
			tokenIdentifier: identity.tokenIdentifier,
			clerkUserId: clerkUserId,
			name: identity.name ?? undefined,
			email: identity.email ?? undefined,
			imageUrl: identity.pictureUrl ?? undefined,
		});

		return userId;
	},
});

/**
 * Get current authenticated user
 */
export const getCurrent = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		return await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique();
	},
});

/**
 * Get user by token identifier
 */
export const getByToken = query({
	args: {
		tokenIdentifier: v.string(),
	},
	handler: async (ctx, { tokenIdentifier }) => {
		return await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
			.unique();
	},
});

/**
 * Internal: Get current user (for use in actions)
 */
export const getCurrentUserInternal = internalQuery({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		return await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique();
	},
});

/**
 * Internal: Get user by Clerk user ID (for webhook processing)
 */
export const getUserByClerkId = internalQuery({
	args: { clerkUserId: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("users")
			.withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
			.unique();
	},
});

/**
 * Internal: Upsert user from Clerk webhook (for user.created event)
 */
export const upsertFromClerkWebhook = internalMutation({
	args: {
		clerkUserId: v.string(),
		email: v.optional(v.string()),
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check for existing user by Clerk user ID
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
			.unique();

		const name = [args.firstName, args.lastName].filter(Boolean).join(" ") || undefined;

		if (existingUser) {
			// Update existing user
			await ctx.db.patch(existingUser._id, {
				email: args.email,
				name,
				imageUrl: args.imageUrl,
			});
			return existingUser._id;
		}

		// Create new user
		// Don't set tokenIdentifier here - it will be set correctly when the user
		// first authenticates via the store() mutation, which has access to the
		// actual JWT tokenIdentifier. We use clerkUserId for webhook-based lookups.
		const userId = await ctx.db.insert("users", {
			clerkUserId: args.clerkUserId,
			email: args.email,
			name,
			imageUrl: args.imageUrl,
		});

		return userId;
	},
});

/**
 * Internal: Mark user as seeded with parks
 */
export const markUserSeeded = internalMutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.userId, {
			seededAt: Date.now(),
		});
	},
});
