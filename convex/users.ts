import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Store or update user from Clerk identity.
 * Called after successful authentication.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called store without authentication");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (existingUser) {
      // Update if name/email changed
      const updates: Record<string, string | undefined> = {};
      if (existingUser.name !== identity.name) {
        updates.name = identity.name ?? undefined;
      }
      if (existingUser.email !== identity.email) {
        updates.email = identity.email ?? undefined;
      }
      if (existingUser.imageUrl !== identity.pictureUrl) {
        updates.imageUrl = identity.pictureUrl ?? undefined;
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existingUser._id, updates);
      }
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? undefined,
      email: identity.email ?? undefined,
      imageUrl: identity.pictureUrl ?? undefined,
    });

    // Create default free tier entitlement for new user
    const now = Date.now();
    await ctx.db.insert("userEntitlements", {
      userId,
      tier: "free",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

/**
 * Get user by token identifier.
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
 * Get current user.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});

/**
 * Get current user (internal).
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
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});

/**
 * Mark user as seeded with parks (internal).
 */
export const markUserSeeded = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { seededAt: Date.now() });
  },
});
