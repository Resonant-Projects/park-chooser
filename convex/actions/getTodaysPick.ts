"use node";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { loadFreshPhotos } from "../lib/googleMaps";

export interface TodaysPickResult {
	_id: string;
	name: string;
	customName?: string;
	address?: string;
	photoUrl?: string;
	photoUrls?: string[]; // All available photos for carousel
	placeId: string;
	chosenAt: number;
}

/**
 * Get today's pick for the current user.
 * Returns the park they picked today (if any) with photo URL.
 */
export const getTodaysPick = action({
	args: {},
	handler: async (ctx): Promise<TodaysPickResult | null> => {
		const apiKey = process.env.GOOGLE_MAPS_API_KEY;

		const user = await ctx.runQuery(internal.users.getCurrentUserInternal);
		if (!user) return null;

		const todaysPick = await ctx.runQuery(internal.picks.getTodaysPickForUser, {
			userId: user._id,
		});

		if (!todaysPick) return null;

		// Generate photo URLs - ALWAYS fetch fresh refs because Google photo names expire
		const photos = await loadFreshPhotos(
			todaysPick.placeId,
			todaysPick.name,
			apiKey,
			"getTodaysPick"
		);

		return {
			_id: todaysPick.parkId.toString(),
			name: todaysPick.name,
			customName: todaysPick.customName,
			address: todaysPick.address,
			photoUrl: photos.photoUrl,
			photoUrls: photos.photoUrls.length > 0 ? photos.photoUrls : undefined,
			placeId: todaysPick.placeId,
			chosenAt: todaysPick.chosenAt,
		};
	},
});
