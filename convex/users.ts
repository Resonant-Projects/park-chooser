import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Store or update user from Clerk identity.
 * Called after successful authentication.
 * Optionally processes a referral code for new signups.
 */
export const store = mutation({
  args: {
    referralCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    // Process referral code if provided (new user only)
    if (args.referralCode) {
      await processReferralCode(ctx, userId, args.referralCode);
    }

    return userId;
  },
});

/**
 * Process referral code for new user signup.
 * Creates a pending referral if the code is valid.
 */
async function processReferralCode(
  ctx: { db: any; scheduler: any; runQuery: any; runMutation: any },
  newUserId: any,
  code: string
) {
  try {
    // Look up the referral code
    const referralCode = await ctx.runQuery(
      internal.referralCodes.getCodeByString,
      { code: code.toUpperCase() }
    );

    if (!referralCode || !referralCode.isActive) {
      console.log(`Invalid or inactive referral code: ${code}`);
      return;
    }

    // Get the referrer
    const referrer = await ctx.db.get(referralCode.userId);
    if (!referrer) {
      console.log(`Referrer not found for code: ${code}`);
      return;
    }

    // Don't allow self-referral (shouldn't happen but just in case)
    if (referrer._id === newUserId) {
      console.log(`Self-referral attempt blocked`);
      return;
    }

    // Create the pending referral
    await ctx.runMutation(internal.referrals.createPendingReferral, {
      referrerId: referrer._id,
      refereeId: newUserId,
      referralCodeId: referralCode._id,
    });

    // Increment referral count on the code
    await ctx.runMutation(internal.referralCodes.incrementReferralCount, {
      codeId: referralCode._id,
    });

    console.log(`Referral created: ${referrer._id} -> ${newUserId}`);
  } catch (error) {
    // Log but don't fail user creation
    console.error("Failed to process referral code:", error);
  }
}

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

/**
 * Get user by token identifier (internal).
 * Used by webhook handlers to look up user for referral processing.
 */
export const getUserByTokenInternal = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
  },
});
