"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import {
  searchNearbyParks as searchNearbyParksApi,
  calculateDistanceMiles,
  getPhotoUrl,
} from "../lib/googleMaps";

export interface NearbyParkResult {
  _id: string;
  placeId: string;
  name: string;
  address?: string;
  photoUrl?: string;
  distanceMiles: number;
  isInUserList: boolean;
  primaryType?: string;
}

const MILES_TO_METERS = 1609.34;

/**
 * Search for nearby parks within a specified radius.
 * Upserts discovered parks into the master catalog and returns them
 * sorted by distance with user-specific flags.
 */
export const searchNearbyParks = action({
  args: {
    lat: v.number(),
    lng: v.number(),
    radiusMiles: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NearbyParkResult[]> => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key not configured");
    }

    // Validate coordinates
    if (args.lat < -90 || args.lat > 90) {
      throw new Error("Invalid latitude: must be between -90 and 90");
    }
    if (args.lng < -180 || args.lng > 180) {
      throw new Error("Invalid longitude: must be between -180 and 180");
    }

    const radiusMiles = args.radiusMiles ?? 10;
    const radiusMeters = radiusMiles * MILES_TO_METERS;

    // Call Google Places API
    const nearbyParks = await searchNearbyParksApi(args.lat, args.lng, radiusMeters, apiKey);

    if (nearbyParks.length === 0) {
      return [];
    }

    // Upsert discovered parks into database
    const upsertedParks = await ctx.runMutation(internal.parks.upsertDiscoveredParks, {
      parks: nearbyParks.map((p) => ({
        placeId: p.placeId,
        name: p.name,
        address: p.address,
        photoRefs: p.photoRefs,
        lat: p.lat,
        lng: p.lng,
        primaryType: p.primaryType,
      })),
    });

    // Create a map of placeId -> database _id
    const placeIdToDbId = new Map<string, Id<"parks">>(
      upsertedParks.map((p: { placeId: string; _id: Id<"parks"> }) => [p.placeId, p._id])
    );

    // Get current user's park list (if authenticated)
    let userParkIds: string[] = [];
    const user = await ctx.runQuery(internal.users.getCurrentUserInternal);
    if (user) {
      userParkIds = await ctx.runQuery(internal.userParks.getUserParkIds, {
        userId: user._id,
      });
    }
    const userParkIdSet = new Set(userParkIds);

    // Build results with distances and user flags
    const results: NearbyParkResult[] = nearbyParks.map((park) => {
      const dbId = placeIdToDbId.get(park.placeId);
      const dbIdStr = dbId?.toString() ?? "";
      const distance = calculateDistanceMiles(args.lat, args.lng, park.lat, park.lng);

      // Generate photo URL if available
      let photoUrl: string | undefined;
      if (park.photoRefs.length > 0) {
        photoUrl = getPhotoUrl(park.photoRefs[0], apiKey, 800);
      }

      return {
        _id: dbIdStr,
        placeId: park.placeId,
        name: park.name,
        address: park.address,
        photoUrl,
        distanceMiles: Math.round(distance * 10) / 10, // Round to 1 decimal
        isInUserList: userParkIdSet.has(dbIdStr),
        primaryType: park.primaryType,
      };
    });

    // Sort by distance
    results.sort((a, b) => a.distanceMiles - b.distanceMiles);

    return results;
  },
});
