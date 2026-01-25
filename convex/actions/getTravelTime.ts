"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { getTravelTime, getTravelTimeBatch } from "../lib/googleMaps";

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
	handler: async (_ctx, args): Promise<TravelTimeResponse | null> => {
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

export interface BatchTravelTimeResponse {
	[placeId: string]: TravelTimeResponse | null;
}

/**
 * Calculate driving distances to multiple parks in a single API call.
 * More efficient than individual calls when fetching distances for a list of parks.
 * Max 25 destinations per call (API limit).
 */
export const calculateBatchTravelTime = action({
	args: {
		originLat: v.number(),
		originLng: v.number(),
		placeIds: v.array(v.string()),
	},
	handler: async (_ctx, args): Promise<BatchTravelTimeResponse> => {
		const apiKey = process.env.GOOGLE_MAPS_API_KEY;

		if (!apiKey) {
			console.error("GOOGLE_MAPS_API_KEY not configured");
			return {};
		}

		if (args.placeIds.length === 0) {
			return {};
		}

		const resultsMap = await getTravelTimeBatch(
			args.originLat,
			args.originLng,
			args.placeIds,
			apiKey
		);

		// Convert Map to plain object for JSON serialization
		const response: BatchTravelTimeResponse = {};
		for (const [placeId, result] of resultsMap) {
			response[placeId] = result;
		}

		return response;
	},
});
