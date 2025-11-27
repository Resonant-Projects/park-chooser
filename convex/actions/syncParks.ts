"use node";

import { action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  fetchPlaceDetails,
  PARK_PLACE_IDS,
  type PlaceDetails,
} from "../lib/googleMaps";

// Sync interval: 24 hours
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Action to sync parks from Google Places API.
 * This fetches details for each park and upserts them into the database.
 */
export const syncParks = action({
  args: {
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY environment variable is required");
    }

    // Check if we need to sync
    const syncState = await ctx.runQuery(internal.parks.getSyncState);
    const now = Date.now();

    if (
      !args.force &&
      syncState &&
      now - syncState.lastSyncedAt < SYNC_INTERVAL_MS
    ) {
      console.log("Skipping sync - last synced recently");
      return { synced: false, count: 0 };
    }

    console.log(`Syncing ${PARK_PLACE_IDS.length} parks...`);

    const parks: PlaceDetails[] = [];

    // Fetch details for each park (with some rate limiting)
    for (const placeId of PARK_PLACE_IDS) {
      const details = await fetchPlaceDetails(placeId, apiKey);
      if (details) {
        parks.push(details);
      }
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Upsert parks into the database
    await ctx.runMutation(internal.parks.upsertParks, {
      parks: parks.map((p) => ({
        placeId: p.placeId,
        name: p.name,
        address: p.address,
        photoRefs: p.photoRefs,
      })),
    });

    // Update sync state
    await ctx.runMutation(internal.parks.updateSyncState, {
      lastSyncedAt: now,
    });

    console.log(`Synced ${parks.length} parks`);
    return { synced: true, count: parks.length };
  },
});

