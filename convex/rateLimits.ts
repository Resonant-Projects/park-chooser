import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_CONTACT_SUBMISSIONS = 5;
const MAX_FEEDBACK_SUBMISSIONS = 3;

/**
 * Check if an action is rate limited for a given identifier
 */
export const checkRateLimit = query({
  args: {
    identifier: v.string(),
    action: v.string(),
  },
  handler: async (ctx, { identifier, action }) => {
    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_action", (q) =>
        q.eq("identifier", identifier).eq("action", action)
      )
      .first();

    if (!record) {
      return { isLimited: false, remaining: getMaxForAction(action) };
    }

    const now = Date.now();
    const windowExpired = now - record.windowStart > RATE_LIMIT_WINDOW_MS;

    if (windowExpired) {
      return { isLimited: false, remaining: getMaxForAction(action) };
    }

    const max = getMaxForAction(action);
    const remaining = Math.max(0, max - record.count);

    return {
      isLimited: record.count >= max,
      remaining,
    };
  },
});

/**
 * Increment rate limit counter for an action
 */
export const incrementRateLimit = mutation({
  args: {
    identifier: v.string(),
    action: v.string(),
  },
  handler: async (ctx, { identifier, action }) => {
    const now = Date.now();

    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_action", (q) =>
        q.eq("identifier", identifier).eq("action", action)
      )
      .first();

    if (!record) {
      await ctx.db.insert("rateLimits", {
        identifier,
        action,
        count: 1,
        windowStart: now,
      });
      return;
    }

    const windowExpired = now - record.windowStart > RATE_LIMIT_WINDOW_MS;

    if (windowExpired) {
      await ctx.db.patch(record._id, {
        count: 1,
        windowStart: now,
      });
    } else {
      await ctx.db.patch(record._id, {
        count: record.count + 1,
      });
    }
  },
});

function getMaxForAction(action: string): number {
  switch (action) {
    case "contact":
      return MAX_CONTACT_SUBMISSIONS;
    case "feedback":
      return MAX_FEEDBACK_SUBMISSIONS;
    default:
      return 10;
  }
}
