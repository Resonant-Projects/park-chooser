import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Submit user feedback
 */
export const submit = mutation({
  args: {
    userId: v.id("users"),
    rating: v.number(),
    likesText: v.optional(v.string()),
    improvementsText: v.optional(v.string()),
    featureRequestsText: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, rating, likesText, improvementsText, featureRequestsText }
  ) => {
    // Validate rating is 1-5
    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const feedbackId = await ctx.db.insert("feedback", {
      userId,
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
 * List all feedback (for admin)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const query = ctx.db.query("feedback").withIndex("by_created").order("desc");

    if (limit) {
      return await query.take(limit);
    }
    return await query.collect();
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
