"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { getPhotoUrls, getFreshPhotoRefs } from "../lib/googleMaps";

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
    let photoUrl: string | undefined;
    let photoUrls: string[] = [];

    if (apiKey) {
      // Always fetch fresh photo references - stored refs expire and return 404
      console.log(
        `[getTodaysPick] Fetching fresh photo refs for "${todaysPick.name}" (placeId: ${todaysPick.placeId})`
      );
      const freshPhotoRefs = await getFreshPhotoRefs(todaysPick.placeId, apiKey, 10);

      if (freshPhotoRefs.length > 0) {
        photoUrls = getPhotoUrls(freshPhotoRefs, apiKey, 1200, 5);
        photoUrl = photoUrls[0];
        console.log(
          `[getTodaysPick] Generated ${photoUrls.length} photo URLs for "${todaysPick.name}"`
        );
      } else {
        console.warn(
          `[getTodaysPick] No photos available for park "${todaysPick.name}" (placeId: ${todaysPick.placeId})`
        );
      }
    } else {
      console.error("[getTodaysPick] GOOGLE_MAPS_API_KEY not configured - photos will not load!");
    }

    return {
      _id: todaysPick.parkId.toString(),
      name: todaysPick.name,
      customName: todaysPick.customName,
      address: todaysPick.address,
      photoUrl,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      placeId: todaysPick.placeId,
      chosenAt: todaysPick.chosenAt,
    };
  },
});
