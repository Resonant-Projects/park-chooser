"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { getTravelTime } from "../lib/googleMaps";

export interface TravelTimeResponse {
  durationText: string;
  distanceText: string;
}

/**
 * Calculate driving time from user's location to a park.
 * Called from client-side after geolocation is obtained.
 */
export const calculateTravelTime = action({
  args: {
    originLat: v.number(),
    originLng: v.number(),
    placeId: v.string(),
  },
  handler: async (ctx, args): Promise<TravelTimeResponse | null> => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("GOOGLE_MAPS_API_KEY not configured");
      return null;
    }

    const result = await getTravelTime(args.originLat, args.originLng, args.placeId, apiKey);

    if (!result) {
      return null;
    }

    return {
      durationText: result.durationText,
      distanceText: result.distanceText,
    };
  },
});
