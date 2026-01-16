"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Submit a support ticket with spam prevention
 *
 * Validates:
 * 1. Honeypot field is empty (spam prevention)
 * 2. Message length is within bounds (20-2000 chars)
 * 3. Rate limit not exceeded (5/hour per IP)
 *
 * Then creates the ticket and returns reference ID
 */
export const submitSupportTicket = action({
  args: {
    email: v.string(),
    subject: v.union(
      v.literal("bug"),
      v.literal("billing"),
      v.literal("feature"),
      v.literal("other")
    ),
    message: v.string(),
    honeypot: v.optional(v.string()), // Should be empty
    ipHash: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { email, subject, message, honeypot, ipHash }
  ): Promise<{ success: boolean; referenceId: string }> => {
    // 1. Honeypot check - reject if filled (bot detection)
    if (honeypot && honeypot.length > 0) {
      // Silently accept but don't process (don't reveal to bots)
      return {
        success: true,
        referenceId: "TP-XXXXXX",
      };
    }

    // 2. Message validation
    if (message.length < 20) {
      throw new Error("Message must be at least 20 characters");
    }
    if (message.length > 2000) {
      throw new Error("Message must be less than 2000 characters");
    }

    // 3. Email validation (basic)
    if (!email.includes("@") || email.length < 5) {
      throw new Error("Please enter a valid email address");
    }

    // 4. Rate limit check
    const identifier = ipHash || "anonymous";
    const rateCheck = await ctx.runQuery(api.rateLimits.checkRateLimit, {
      identifier,
      action: "contact",
    });

    if (rateCheck.isLimited) {
      throw new Error("Too many submissions. Please wait an hour before trying again.");
    }

    // 5. Get user ID if authenticated
    const identity = await ctx.auth.getUserIdentity();
    let userId = undefined;
    if (identity) {
      const user = await ctx.runQuery(api.users.getByToken, {
        tokenIdentifier: identity.tokenIdentifier,
      });
      if (user) {
        userId = user._id;
      }
    }

    // 6. Create the ticket
    const result = await ctx.runMutation(api.support.createTicket, {
      email,
      subject,
      message,
      userId,
      ipHash: identifier,
    });

    // 7. Increment rate limit
    await ctx.runMutation(api.rateLimits.incrementRateLimit, {
      identifier,
      action: "contact",
    });

    // TODO: Send email notifications via Resend
    // - Admin notification with ticket details
    // - User confirmation with reference ID

    return {
      success: true,
      referenceId: result.referenceId,
    };
  },
});
