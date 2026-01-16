import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

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
  handler: async (
    ctx,
    { rating, likesText, improvementsText, featureRequestsText }
  ) => {
    // Verify the caller is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to submit feedback");
    }

    // Get user from database
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
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
 * Get feedback by user (to check if they already submitted)
 */
export const getByUser = query({
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
