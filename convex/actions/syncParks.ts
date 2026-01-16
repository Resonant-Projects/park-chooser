"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { fetchPlaceDetails, searchPlace, SRQ_PARKS, type PlaceDetails } from "../lib/googleMaps";

// Sync interval: 24 hours
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Action to sync parks from Google Places API.
 * Uses Text Search to find each park by name, then fetches full details.
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

    if (!args.force && syncState && now - syncState.lastSyncedAt < SYNC_INTERVAL_MS) {
      console.log("Skipping sync - last synced recently");
      return { synced: false, count: 0 };
    }

    console.log(`Syncing ${SRQ_PARKS.length} parks from SRQ Parks list...`);

    const parks: PlaceDetails[] = [];

    // For each park in the list, search for it and fetch details
    for (const parkEntry of SRQ_PARKS) {
      console.log(`Searching for: ${parkEntry.name}`);

      // First, find the place ID using Text Search
      const placeId = await searchPlace(parkEntry.searchQuery, apiKey);

      if (!placeId) {
        console.warn(`Could not find place ID for: ${parkEntry.name}`);
        continue;
      }

      console.log(`Found place ID: ${placeId} for ${parkEntry.name}`);

      // Then fetch full details
      const details = await fetchPlaceDetails(placeId, apiKey);

      if (details) {
        parks.push(details);
        console.log(`Fetched details for: ${details.name} (${details.photoRefs.length} photos)`);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
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

    console.log(`Synced ${parks.length} parks successfully`);
    return { synced: true, count: parks.length };
  },
});
