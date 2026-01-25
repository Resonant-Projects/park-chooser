"use node";

import { v } from "convex/values";
import { api } from "../_generated/api";
import { action } from "../_generated/server";

/**
 * Submit user feedback (requires authentication)
 *
 * Validates:
 * 1. User is authenticated
 * 2. Rating is valid (1-5)
 * 3. Rate limit not exceeded
 */
export const submitFeedback = action({
	args: {
		rating: v.number(),
		likesText: v.optional(v.string()),
		improvementsText: v.optional(v.string()),
		featureRequestsText: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ rating, likesText, improvementsText, featureRequestsText }
	): Promise<{ success: boolean; feedbackId: string }> => {
		// 1. Authentication check
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("You must be signed in to submit feedback");
		}

		// 2. Get user from database
		const user = await ctx.runQuery(api.users.getByToken, {
			tokenIdentifier: identity.tokenIdentifier,
		});

		if (!user) {
			throw new Error("User not found");
		}

		// 3. Validate rating
		if (rating < 1 || rating > 5) {
			throw new Error("Rating must be between 1 and 5");
		}

		// 4. Atomic rate limit check and increment (prevents TOCTOU race condition)
		const rateResult = await ctx.runMutation(api.rateLimits.checkAndIncrementRateLimit, {
			identifier: user._id,
			action: "feedback",
		});

		if (!rateResult.allowed) {
			throw new Error(
				"You've already submitted feedback recently. Please wait before submitting again."
			);
		}

		// 5. Truncate text fields if too long
		const sanitize = (text: string | undefined, maxLen: number) => {
			if (!text) return undefined;
			return text.slice(0, maxLen);
		};

		// 6. Submit feedback (mutation handles auth internally)
		const result = await ctx.runMutation(api.feedback.submit, {
			rating,
			likesText: sanitize(likesText, 1000),
			improvementsText: sanitize(improvementsText, 1000),
			featureRequestsText: sanitize(featureRequestsText, 1000),
		});

		// Rate limit already incremented atomically in step 4

		return {
			success: true,
			feedbackId: result.feedbackId,
		};
	},
});
