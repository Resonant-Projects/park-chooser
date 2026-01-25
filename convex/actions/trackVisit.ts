"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

/**
 * Track a visit to a park when user clicks "Open in Google Maps".
 * Updates the user-specific visit count in userParks.
 */
export const trackVisit = action({
	args: { parkId: v.id("parks") },
	handler: async (ctx, args) => {
		const user = await ctx.runQuery(internal.users.getCurrentUserInternal);

		if (user) {
			await ctx.runMutation(internal.userParks.incrementUserParkVisit, {
				userId: user._id,
				parkId: args.parkId,
			});
		}
		// Silently ignore if user not authenticated (fire-and-forget behavior)
	},
});
